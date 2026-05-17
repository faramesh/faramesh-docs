---
title: Tutorial — Debug a denial
description: Why was my call denied? A diagnostic walkthrough using faramesh explain, the WAL, and the structured denial payload.
---

A call denied. You're staring at a `ToolDeniedException` and wondering which rule fired and why. This guide walks you through diagnosing it.

## The structured denial payload

Every denial in Faramesh is a structured payload, not a string. When `ToolDeniedException` is raised in your SDK, it has fields:

```python title="agent.py"
try:
    result = tools[0].invoke({"to": "user@example.com"})
except ToolDeniedException as e:
    print(e.code)             # POLICY_DENY | POLICY_DEFER | RATE_EXCEEDED | BUDGET_EXCEEDED | …
    print(e.effect)            # DENY | DEFER | ABSTAIN
    print(e.reason)            # human-readable; from `reason "…"` in your rule
    print(e.rule_ref)          # which rule matched
    print(e.denial_token)      # opaque token for replay/inspection
    print(e.defer_token)       # if effect == DEFER, the approval id
```

In TypeScript the exception is the same shape. The fields are also in every DPR.

→ Full enumeration: [Denial codes](/errors/).

## Step 1: read the payload

Most of the time the denial tells you exactly what happened:

```text title="ToolDeniedException"
code:     POLICY_DENY
effect:   DENY
reason:   refunds over $500 require platform team
rule_ref: refund@governance.fms:14
```

That's a clear `deny refund reason "refunds over $500 require platform team"` from line 14 of your policy. You either need to change the rule (`defer` instead of `deny`) or change the call (smaller amount).

If the reason is unfamiliar, `rule_ref` points to the exact line. Open `governance.fms` and read it.

## Step 2: faramesh explain

If the payload doesn't make sense, ask the daemon directly:

```bash title="Terminal"
faramesh explain decision <denial_token>
```

You get the full evaluation context:

- The agent identity that resolved.
- Every rule that was tried and whether it matched.
- Each condition that was evaluated and what it returned.
- The rate-limit and budget state at decision time.
- The redacted argument payload.

```text title="faramesh explain decision dnl_ab1f…"
agent:    support-bot   (identity verified via SPIFFE)
tool:     refund
rule:     refund@governance.fms:14   (deny)

evaluation:
  rule#1  permit refund if amount < $25     → no match (amount=600)
  rule#2  defer  refund if amount < $500    → no match (amount=600)
  rule#3  deny   refund                     → match → DENY

rate limits:  refund=2/5 per minute (ok)
budgets:      daily=$120/$1000 (ok)
egress:       n/a (sdk-tier)
redaction:    args.card.number masked
```

This is the highest-signal debug tool in the system. Use it first.

## Step 3: faramesh plan

If a rule changed and now you're seeing different behavior, replay history against the new policy:

```bash title="Terminal"
faramesh plan
```

`plan` walks the last 24 hours of decisions (from the WAL) and reports which would change under the current `governance.fms`. It tells you:

- "27 calls that previously permitted now defer."
- "12 calls that previously deferred now deny."
- "no change for 1,403 calls."

Useful for rolling out a stricter rule without surprises.

## Step 4: walk the WAL

For deeper analysis (compliance, audit, retros), query the WAL directly:

```bash title="Terminal"
faramesh audit ls --tool refund --since 1h
faramesh audit show <dpr_id>
faramesh audit verify
```

`ls` lists; `show` prints the full DPR; `verify` checks the hash chain. With KMS signing enabled, `verify` also checks signatures.

## Common denial scenarios

### "Why did my permit not match?"

Most often: a more specific rule above it denied first. Rules are top-to-bottom, first match wins. `faramesh explain` will show you which rule matched.

### "Rate exceeded with code RATE_EXCEEDED"

Your `rate_limit` bucket is empty. The payload includes a `retry_after_seconds`. To raise the limit, edit `governance.fms` and `faramesh apply`.

### "Budget exceeded with code BUDGET_EXCEEDED"

The agent has hit its `budget`. Check the current state:

```bash title="Terminal"
faramesh status
```

Daily budgets reset on UTC midnight by default. Bump `max` or change `on_exceed` to `defer` if you want approval rather than denial.

### "Egress denied for host X"

The destination is not in `egress.allow`. Either add it or stop calling that host. **Don't** add `*` — egress confinement is one of your real defenses.

### "DAEMON_NOT_READY"

The daemon is still in `INITIALIZING`. The payload includes `retry_after_seconds`. If you're seeing this in production, your cold-start window (`runtime { cold_start_deny_window = … }`) is too short for your provider init. Raise it.

### "CREDENTIAL_UNAVAILABLE"

A provider couldn't mint the credential the rule required (Vault unreachable, AWS STS rate-limited, etc.). The decision was logically a permit; Faramesh failed closed because it can't fulfill the credential safely. Check provider health.

### "POLICY_DEFER" — and the approval never resolved

The defer token has a timeout. If no operator approves it within the configured window (default 24h), it expires:

```bash title="Terminal"
faramesh approvals list --status pending
faramesh approvals show <token>
```

To approve from CLI:

```bash title="Terminal"
faramesh approvals approve <token> --reason "manual review passed"
```

For higher volume, use the [Faramesh Cloud approvals UI](/cloud/) or your own integration via the SDK socket.

## When to change the rule vs. the call

A useful diagnostic question: **was this call something the agent should be allowed to do?**

- "Yes, I want this allowed" → change the rule (`defer` → `permit`, narrow the condition, raise the budget).
- "No, this call shouldn't happen" → fix the agent, not the policy. The denial is doing its job.
- "Yes, but only with a human in the loop" → keep `defer`, build out the approval workflow.

## Where to go next

- [Denial codes](/errors/) — every code, with payload and recovery.
- [FPL reference](/fpl/) — the grammar in detail.
- [Auditing](/concepts/auditing/) — DPR structure, hash chain, KMS verification.
- [Approvals CLI](/cli/approvals/) — manage the deferred queue.
