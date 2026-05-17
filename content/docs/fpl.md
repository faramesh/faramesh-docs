---
title: FPL language reference
description: Grammar, types, and every construct in the Faramesh Policy Language.
---

**FPL**. Faramesh Policy Language, is the default syntax for `governance.fms`. It compiles to a deterministic AST that the daemon evaluates. YAML and JSON encode the same AST.

This page is the language reference. For block semantics see [Stack reference](/stack/). For step-by-step authoring guidance start with [Write your first policy](/guides/your-first-policy/).

## A small policy, end to end

Before the grammar, here's a complete `governance.fms` you can read top to bottom. The rest of the page is a reference for everything in it (and a few things that aren't).

```hcl title="governance.fms"
import "github.com/faramesh/faramesh-registry/frameworks/langgraph@1.0.0"

runtime {
  mode    = "enforce"
  wal_dir = "./faramesh-wal"
  backend = "sqlite"
}

agent "support-bot" {
  default deny

  rules {
    permit search_docs
    permit stripe/refund if amount < $500
    defer  stripe/refund if amount >= $500
    deny   stripe/payouts reason "platform team only"
  }

  rate_limit "stripe/*": 10 per minute

  redact stripe/refund args: ["card_number", "cvv"]

  budget daily {
    max       $500
    warn_at   0.8
    on_exceed defer
  }

  egress {
    allow = ["api.stripe.com", "docs.example.com"]
  }

  alert {
    on     = "deny"
    notify = "slack://#sec-alerts"
  }
}
```

**What this policy says, in plain English:**

> The `support-bot` agent denies everything by default. It's allowed to search docs. It can issue Stripe refunds under $500 directly; refunds of $500+ wait for a human. Payouts are flat-out denied. Stripe calls are rate-limited to 10/minute. Card numbers and CVVs are redacted from the audit log. The agent has a $500 daily budget; at 80% we get a warning, at 100% new charges defer for human review. The agent can only talk to Stripe and our docs site. Every denial pings `#sec-alerts`.

You'll write something like this for every agent. The rest of the page tells you what each piece means and what's available.

## File shape

```hcl title="governance.fms"
# Optional imports
import "github.com/faramesh/faramesh-registry/frameworks/langgraph@1.0.0"
import "github.com/faramesh/faramesh-registry/policies/stripe@1.3.0" as stripe_rules

# Top-level configuration blocks
runtime  { ... }
provider "vault" { ... }
identity "spire-default" { ... }
trust    { ... }

# One or more agents
agent "my-agent" { ... }
```

Order is not significant. Comments start with `#` and run to end of line.

## Literals and types

| Type | Examples |
|------|----------|
| String | `"hello"`, `"api.example.com"` |
| Number | `42`, `3.14`, `1e3` |
| Money | `$500`, `$10.00` (number with a `$` prefix; same scalar at runtime) |
| Bool | `true`, `false` |
| Identifier | `permit`, `deny`, `stripe`, `myproject-agent` |
| Glob | `stripe/*`, `api/v1/*` (used in rules, rate limits) |
| Environment | `env("VAULT_TOKEN")` (resolved at compile time) |
| List | `["a", "b", "c"]` |

All strings are UTF-8. Identifiers may contain `[A-Za-z0-9_-]`. Tool names and rule patterns use `/` as a namespace separator.

## Imports

```hcl title="governance.fms"
import "<registry-host>/<path>@<semver>"
import "<registry-host>/<path>@<semver>" as <alias>
```

- Pinned semver is required. `@latest` is rejected at `faramesh check`.
- Paths follow `kind/name`: `frameworks/<id>`, `policies/<id>`, `providers/<id>`.
- An alias is optional; you may reference the imported AST through it.

## `runtime`

```hcl title="governance.fms"
runtime {
  mode                      = "enforce"
  wal_dir                   = "./faramesh-wal"
  backend                   = "sqlite"
  socket                    = "/tmp/faramesh.sock"
  http_listen               = "127.0.0.1:8080"
  mcp_proxy_port            = 8081
  cold_start_deny_window    = "5s"
  os_tier                   = true
  strip_ambient_credentials = true
  agent_enforce_profile     = "full"
  supervised_command        = "python agent.py"
}
```

`runtime` accepts string, number, bool, or `env("...")` values. See [stack](/stack/) for field reference. Unknown fields are reported by `faramesh check`.

## `provider`

```hcl title="governance.fms"
provider "<local-name>" {
  type = "vault"
  addr = env("VAULT_ADDR")
  ...
}
```

The `type` field selects the provider. The remaining fields are the provider's schema (see [Providers](/providers/)).

## `identity`

```hcl title="governance.fms"
identity "<local-name>" {
  type         = "spiffe"
  socket       = "/run/spire/agent.sock"
  trust_domain = "corp.faramesh.dev"
}
```

## `trust`

A free-form block of trust-root declarations parsed line-by-line. Used to verify signed registry artifacts.

```hcl title="governance.fms"
trust {
  key "github.com/faramesh/faramesh-registry" ed25519:nxNjaQnS3L+zzKrRq48XfYBDWlFXkNJkxUiTD8j0sFs=
}
```

## `agent`

```hcl title="governance.fms"
agent "<id>" {
  default deny
  model      = "claude-sonnet-4"
  framework  = "langgraph"
  version    = "1.0.0"
  rules      { ... }
  budget     daily { ... }
  rate_limit "<pattern>": <n> per <window>
  redact     <tool> args: ["<path>", ...]
  egress     { ... }
  model_policy { ... }
  session    { ... }
  spawn      { ... }
  completion_gate { ... }
  enforcement { ... }
  alert      { ... }
  delegate   { ... }
  ambient    { ... }
  credential { ... }
  selector   { ... }
  phase      { ... }
  var        <key> = <value>
}
```

The `agent` block accepts the inner blocks below, each described in detail.

### `rules`

```hcl title="governance.fms"
rules {
  permit <tool> [if <condition>] [host <host>] [method <verb>] [path <path>]
  defer  <tool> [if <condition>]
  deny   <tool> [if <condition>] [reason "<message>"]
}
```

Effects: `permit`, `defer`, `deny`. Rules are checked top to bottom; the first match wins. If nothing matches, the agent's `default` effect applies (`deny` by convention).

`<tool>` can be:

- A bare identifier: `send_email`
- A namespaced name: `stripe/charge`
- A glob: `stripe/*`, `api/v1/*`

### Conditions

`if` clauses are boolean expressions over the action payload.

| Operator | Example |
|----------|---------|
| `==` `!=` | `tool == "stripe/charge"` |
| `<` `<=` `>` `>=` | `amount < $500` |
| `in` | `currency in ["USD", "EUR"]` |
| `and` `or` `not` | `amount < $500 and currency == "USD"` |
| `matches` | `path matches "/v1/[0-9]+"` |

Available variables in expressions:

- `tool`, `agent`, `action`, `model`
- `args.<field>`, flattened argument paths (e.g. `args.amount`)
- `host`, `method`, `path`, `query.<k>`, `headers.<k>` (when governing HTTP)
- `principal`, `principal.email`, `principal.groups`
- `time.hour`, `time.weekday`, `time.now`

**Worked condition examples.** Each of these is a real rule you'd ship:

```hcl title="governance.fms"
# Tiered approval ladder by amount
permit stripe/charge if amount < $50
permit stripe/charge if amount < $500 and principal.groups contains "ops"
defer  stripe/charge if amount < $5000
deny   stripe/charge

# Multi-condition with currency allow-list
permit stripe/charge if amount < $500 and currency in ["USD", "EUR", "GBP"]

# Path-pattern guard for HTTP-governed APIs
permit api/get if path matches "^/v1/orders/[0-9]+$"
deny   api/get if path matches "/admin"

# Time-of-day restriction
defer  github/merge if time.hour >= 18 or time.hour < 8

# Principal-based rule for delegated agents
permit fs/write if principal.email == "ops@example.com"
deny   fs/write

# Email confined to your domain
permit send_email if args.to matches "@(example\\.com|example\\.io)$"
deny   send_email reason "external email requires approval"
```

Conditions are pure: no functions, no side effects, no I/O. If a referenced field is missing from the payload, the condition evaluates to false (the rule does not match).

### `rate_limit`

```hcl title="governance.fms"
rate_limit "<glob>": <n> per <window>
```

`<window>` ∈ { `second`, `minute`, `hour`, `day` }.

**Examples.** Token-bucket limits per agent per pattern:

```hcl title="governance.fms"
rate_limit "stripe/*":     10 per minute     # all Stripe calls combined
rate_limit "stripe/charge": 5 per minute     # narrower limit on charges
rate_limit "send_email":   100 per hour
rate_limit "github/*":     1000 per day
```

When the bucket is empty, the daemon returns `RATE_EXCEEDED` with a `retry_after_seconds` hint. Buckets refill at the configured rate and survive WAL replay across restarts.

### `redact`

```hcl title="governance.fms"
redact <tool> args: ["<path>", "<path>", ...]
```

Argument paths are dot-separated for nested objects: `payment.card.number`.

**Examples.** Redacted fields are masked **before** they reach the WAL or any audit sink:

```hcl title="governance.fms"
redact stripe/charge   args: ["card_number", "cvv"]
redact send_email      args: ["body"]                        # don't log message bodies
redact db/query        args: ["params.ssn", "params.dob"]    # nested paths
redact http/post       args: ["headers.authorization"]
```

The original arguments are never persisted. The redacted form is what subsequently flows to providers and audit sinks.

### `budget`

```hcl title="governance.fms"
budget <id> {
  max       $<amount>
  daily     $<amount>      # optional explicit daily cap
  max_calls <number>
  warn_at   <fraction>     # 0–1
  on_exceed deny | defer | audit
}
```

Common ids: `session`, `daily`. Custom ids are allowed.

**Examples.** Budgets are enforced at step 5 of the [decision pipeline](/concepts/enforcement/) using costs from the configured cost provider:

```hcl title="governance.fms"
# Hard daily cap on the agent's total spend
budget daily {
  max       $100
  warn_at   0.8           # log BUDGET_WARNING at 80%
  on_exceed deny          # at 100%, deny new calls
}

# Per-session call ceiling
budget session {
  max_calls 50
  on_exceed defer
}

# Custom budget keyed off any rule
budget refunds_daily {
  max       $5000
  on_exceed defer         # over $5k/day, refunds need a human
}
```

### `egress`

```hcl title="governance.fms"
egress {
  allow = ["<host-glob>", ...]
  deny  = ["<host-glob>", ...]
}
```

### `model_policy`

```hcl title="governance.fms"
model_policy {
  allow = ["claude-sonnet-4", "gpt-4.1-mini"]
}
```

### `session`

```hcl title="governance.fms"
session {
  max_duration = "30m"
  idle_timeout = "5m"
}
```

### `spawn`

```hcl title="governance.fms"
spawn {
  max_concurrent = 3
  allowed_types  = ["analyst", "researcher"]
}
```

### `completion_gate`

```hcl title="governance.fms"
completion_gate {
  require "no_pending_approvals"
  require "budget_under_limit"
  require "no_uncommitted_writes"
}
```

### `enforcement`

```hcl title="governance.fms"
enforcement {
  mcp_proxy_port = 8081
}
```

OS sandboxing is configured on the **`runtime`** block (`os_tier`, `agent_enforce_profile`, `supervised_command`), not here.

### `alert`

```hcl title="governance.fms"
alert {
  on     = "deny"
  notify = "slack://#sec-alerts"
}
```

`on` values: `deny`, `defer`, `permit`, `budget_warning`, `budget_exceeded`, `rate_exceeded`.

`notify` schemes: `slack://`, `email://`, `pagerduty://`, `webhook://`.

### `delegate`

```hcl title="governance.fms"
delegate {
  target_agent = "researcher"
  scope        = "read-only"
  ttl          = "10m"
  ceiling      = "permit"
}
```

### `phase`

Time-bounded rule sets, used for phased rollouts.

```hcl title="governance.fms"
phase "audit-only" {
  duration = "24h"
  next     = "enforce"
  tools    = ["stripe/charge"]
  rules { permit stripe/charge }
}
```

### `var`

Reusable strings inside the agent block.

```hcl title="governance.fms"
var prod_host = "api.production.example.com"

rules {
  permit api/health host prod_host
}
```

## Top-level flat rules (v0 compatibility)

For tiny stacks you can declare flat rules at the top level without an `agent` block:

```hcl title="governance.fms"
permit search_docs
defer  send_email
deny   stripe/payouts
```

These are equivalent to a single anonymous agent.

## YAML equivalents

```yaml title="config.yaml"
agent:
  - id: payments-bot
    default: deny
    rules:
      - { effect: permit, tool: "stripe/charge", condition: "amount < 500" }
      - { effect: defer,  tool: "stripe/refund" }
    rate_limits:
      - { pattern: "stripe/*", limit: 10, window: minute }
    redactions:
      - { tool: "stripe/charge", paths: ["card_number", "cvv"] }
    budgets:
      - { id: daily, max: 500, warn_at: 0.8, on_exceed: deny }
    egress:
      allow: ["api.stripe.com"]
```

## Compilation

```bash title="Terminal"
faramesh check          # parse + type-check
faramesh plan           # show resolved AST and decision diff
faramesh apply          # compile to .faramesh/ and start enforcement
```

Errors include file and line:

```
governance.fms:12: agent "payments-bot": rate_limit "stripe/*": expected 'per <window>'
```

## Cookbook: complete examples

Pick one that matches what you're building. Each is a runnable `governance.fms`.

### A coding agent that can read everything but not push to main

```hcl title="governance.fms"
import "github.com/faramesh/faramesh-registry/policies/shell@1.0.0"

agent "coding-bot" {
  default deny

  rules {
    permit fs/read
    permit fs/list
    permit fs/write if path matches "^./"
    deny   fs/write reason "writes outside repo are forbidden"

    permit shell if args.cmd matches "^(go|npm|pnpm|pytest)\\s"
    deny   shell reason "general shell exec is forbidden"

    permit git/diff
    permit git/commit
    defer  git/push if args.ref == "main"
    permit git/push
  }

  redact fs/read args: [".env", "secrets.json"]
}
```

### A payments agent with a tiered approval ladder

```hcl title="governance.fms"
agent "payments-bot" {
  default deny

  rules {
    permit stripe/charge if amount < $50
    permit stripe/charge if amount < $500 and principal.groups contains "ops"
    defer  stripe/charge if amount < $5000
    deny   stripe/charge

    permit stripe/refund if amount < $500
    defer  stripe/refund

    deny   stripe/payouts reason "platform team only"
  }

  rate_limit "stripe/*": 30 per minute

  redact stripe/charge args: ["card.number", "card.cvv"]

  budget daily {
    max       $25000
    warn_at   0.9
    on_exceed defer
  }

  alert {
    on     = "deny"
    notify = "pagerduty://payments-oncall"
  }
}
```

### A customer-support agent confined to your email domain

```hcl title="governance.fms"
agent "support-bot" {
  default deny

  rules {
    permit knowledgebase/search
    permit ticket/read
    permit ticket/create
    permit send_email if args.to matches "@example\\.com$"
    deny   send_email reason "external email requires approval"
  }

  rate_limit "send_email": 50 per hour

  egress {
    allow = ["api.zendesk.com", "smtp.example.com"]
  }
}
```

### An MCP-governed coding assistant (Claude Code / Cursor)

```hcl title="governance.fms"
runtime {
  mode           = "enforce"
  mcp_proxy_port = 8081
}

agent "claude-code" {
  default deny

  rules {
    permit fs_read
    permit fs_list
    permit fs_write if path matches "^./"
    deny   fs_write
    permit shell if args.command matches "^(go|npm|pnpm|pytest|cargo)\\s"
    deny   shell
    permit github/get
    defer  github/post
  }

  alert { on = "deny" notify = "slack://#agent-denials" }
}
```

Point Claude Code or Cursor at `http://localhost:8081/mcp/<server>` (see [framework guides](/frameworks/claude-code/)).

### A multi-agent orchestrator with delegation

```hcl title="governance.fms"
agent "orchestrator" {
  default deny

  rules {
    permit task/plan
    permit delegate/researcher
    permit delegate/writer
    deny   shell
  }
}

agent "researcher" {
  default deny

  rules {
    permit web/fetch if host in ["docs.example.com", "wikipedia.org"]
    permit search_docs
  }

  rate_limit "web/fetch": 60 per minute
}

agent "writer" {
  default deny

  rules {
    permit fs/write if path matches "^./drafts/"
    permit knowledgebase/search
  }
}
```

## What's next

- [Stack reference](/stack/): block-by-block semantics
- [Write your first policy](/guides/your-first-policy/): step-by-step authoring guide
- [Debug a denial](/guides/debugging-denials/): what to do when a rule fires you didn't expect
- [Providers](/providers/): every provider schema
- [CLI](/cli/): commands and flags
- [Denial codes](/errors/): runtime error payloads
