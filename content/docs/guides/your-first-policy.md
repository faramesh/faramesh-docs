---
title: Tutorial. Write your first policy
description: Build a governance.fms from scratch. Plain-English explanations of every line, with the reasoning behind each rule.
---

This tutorial walks you through writing a `governance.fms` for a fictional but realistic agent. By the end you'll understand every line and feel comfortable authoring policies for your own agents.

## The scenario

You're shipping a customer-support agent that:

- Answers product questions from a knowledge base
- Sends emails to customers (only at your domain)
- Issues refunds (small ones automatically, larger ones with approval)
- Should never call admin or payout APIs

You want every action governed, every secret scoped, and every decision recorded.

## Step 1: the skeleton

Every `governance.fms` starts with imports, runtime config, and at least one agent block.

```hcl title="governance.fms"
runtime {
  mode    = "enforce"
  wal_dir = "./faramesh-wal"
  backend = "sqlite"
}

agent "support-bot" {
  default deny

  rules {
  }
}
```

What's here:

- `runtime` configures the daemon itself. `mode = "enforce"` means denials block; `audit` would let everything through but record what would have been blocked.
- `wal_dir` is where Decision Provenance Records live.
- `agent "support-bot"` opens the policy for one logical agent. The string is the **agent id**: it's what the SDK shim sends with every call so the daemon knows which rules to apply.
- `default deny` is the most important line in the file. **If no rule matches, the call is denied.** This is the only safe default for governance: every permit must be explicit.

## Step 2: permit the safe tools first

Start by permitting only what's clearly safe. Read-only tools are usually first.

```hcl title="governance.fms"
agent "support-bot" {
  default deny

  rules {
    permit knowledgebase/search
    permit ticket/read
  }
}
```

`knowledgebase/search` and `ticket/read` are read-only. There's no scenario where reading the knowledge base is a problem, so an unconditional `permit` is fine.

The slash in the tool name is a convention for "namespace/action." Faramesh treats it as a string match. You can use it or not. Whatever your framework reports as the tool name is what you put here.

## Step 3: rules with conditions

Now the interesting part: tools that should be allowed under some conditions and denied otherwise.

```hcl title="governance.fms"
rules {
  permit knowledgebase/search
  permit ticket/read

  permit refund if amount < $25
  defer  refund if amount < $500
  deny   refund reason "refunds over $500 require platform team"
}
```

Three rules for `refund`, evaluated top to bottom. **first match wins**:

- Refunds under $25 run automatically.
- Refunds between $25 and $500 wait for human approval (`defer`).
- Refunds at or above $500 are flat-out denied with a human-readable reason.

The `reason` is what shows up in the structured denial payload, so the agent (or the developer reading the audit log) understands why.

> **Why three rules instead of one with a complex condition?** Because each rule has one effect. Layered specific-to-general rules read like an English ladder: "do this if X, otherwise do this if Y, otherwise default."

## Step 4: confine outbound communication

`send_email` is the kind of tool that, unconfined, ends up emailing the wrong person. Match the recipient against your domain:

```hcl title="governance.fms"
permit send_email if args.to matches "@example\\.com$"
deny   send_email reason "external email requires approval"
```

`args.to` is the `to` field of the tool's arguments. `matches` is regex. The double backslash escapes the dot so `example.com` doesn't match `examplexcom`. The `$` anchors to end-of-string so you can't append a different domain after it.

## Step 5: rate limits and budgets

Even rules that permit need ceilings. A bug or jailbreak shouldn't translate to unbounded calls.

```hcl title="governance.fms"
rate_limit "refund":     5 per minute
rate_limit "send_email": 100 per hour

budget daily {
  max       $1000
  warn_at   0.8
  on_exceed defer
}
```

- `rate_limit "refund": 5 per minute`: a token bucket. The 6th refund in a minute denies with `RATE_EXCEEDED`. Buckets are per-agent.
- `budget daily { max $1000 }`: the agent's total spend across all permitted calls today is capped at $1000. Cost comes from the configured cost provider; for non-LLM tools it defaults to a flat per-call cost. At 80% you get a `BUDGET_WARNING`; at 100% the configured `on_exceed` (here, `defer`) kicks in.

## Step 6: redact sensitive args before logging

The WAL records every decision, including arguments. **Don't log payment data or PII.** Mask it explicitly:

```hcl title="governance.fms"
redact refund     args: ["card.number", "card.cvv"]
redact send_email args: ["body"]
```

The original arguments are never persisted. The redacted form is what flows to providers and audit sinks. If you need to keep `body` for compliance, redact specific fields inside it instead (`body.ssn`, `body.dob`).

## Step 7: confine where the agent can talk

If you're using the HTTP proxy tier or the SDK shim is making outbound HTTP, lock down the destinations:

```hcl title="governance.fms"
egress {
  allow = ["api.example.com", "knowledgebase.example.com"]
}
```

Anything not on the allow list returns `EGRESS_DENIED`. This is your last line of defense if the model decides to fetch arbitrary URLs.

## Step 8: alerts on the things that matter

```hcl title="governance.fms"
alert {
  on     = "deny"
  notify = "slack://#sec-alerts"
}

alert {
  on     = "budget_exceeded"
  notify = "pagerduty://payments-oncall"
}
```

Multiple `alert` blocks are allowed. Each fires on a specific event. Common targets: Slack channels, PagerDuty services, email lists, generic webhooks.

## The complete policy

Stitching it all together:

```hcl title="governance.fms"
runtime {
  mode    = "enforce"
  wal_dir = "./faramesh-wal"
  backend = "sqlite"
}

agent "support-bot" {
  default deny

  rules {
    permit knowledgebase/search
    permit ticket/read

    permit refund if amount < $25
    defer  refund if amount < $500
    deny   refund reason "refunds over $500 require platform team"

    permit send_email if args.to matches "@example\\.com$"
    deny   send_email reason "external email requires approval"

    deny   admin/*  reason "admins do not run through this agent"
    deny   payouts  reason "payouts are platform-only"
  }

  rate_limit "refund":     5 per minute
  rate_limit "send_email": 100 per hour

  budget daily {
    max       $1000
    warn_at   0.8
    on_exceed defer
  }

  redact refund     args: ["card.number", "card.cvv"]
  redact send_email args: ["body"]

  egress {
    allow = ["api.example.com", "knowledgebase.example.com"]
  }

  alert { on = "deny"             notify = "slack://#sec-alerts" }
  alert { on = "budget_exceeded"  notify = "pagerduty://payments-oncall" }
}
```

## Validate and apply

```bash title="Terminal"
faramesh check     # parse + type-check
faramesh plan      # show the resolved AST and decision diff vs. last applied
faramesh apply     # compile and start (or reload) the daemon
```

If `check` fails, the error includes the file and line:

```
governance.fms:18: agent "support-bot": rate_limit "refund": expected 'per <window>'
```

## Common authoring mistakes

- **Forgetting `default deny`.** Without it, anything not matched falls through to `default permit`, which is rarely what you want.
- **Putting the broad rule before the narrow one.** `permit refund` followed by `deny refund if amount > $500` does nothing. The first rule already matched. Order specific-to-general.
- **Using `==` for tool patterns instead of bare names or globs.** The first token after `permit`/`defer`/`deny` is a tool pattern, not a condition; `==` is a condition operator.
- **Logging secrets.** If your tool args contain anything sensitive, add a `redact` block. The default is to log everything you pass.

## Where to go next

- [FPL reference](/fpl/): every block, every operator, with cookbook examples.
- [Debug a denial](/guides/debugging-denials/): what to do when a rule fires you didn't expect.
- [Govern a LangGraph agent](/guides/govern-a-langgraph-agent/): wire this policy into a real agent.
- [Enforcement](/concepts/enforcement/): what happens at decision time.
