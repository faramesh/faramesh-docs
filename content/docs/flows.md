---
title: Workflows
description: First apply, change policy, monitor production. The three loops you'll run forever.
---

Faramesh has three workflows you'll run again and again. Everything else is a variation on these.

## 1. First apply

You're standing up governance on a new agent project.

```bash title="Terminal"
faramesh init
# edit governance.fms  # promote tools from defer to permit/deny
faramesh check
faramesh plan
faramesh apply
faramesh status
```

| Step | What it does |
|------|--------------|
| `init` | Detects the framework, finds tool registrations, writes `governance.fms` with every tool deferred. |
| edit | You decide which tools are read-only and safe to `permit`, which need to `defer`, and which to `deny` outright. |
| `check` | Parses, type-checks, resolves registry imports. |
| `plan` | Compiles policy and prints what would change at apply. |
| `apply` | Compiles to `.faramesh/`, launches providers, starts enforcement. |
| `status` | Confirms the daemon is live and policy version matches. |

The first agent run will surface anything you missed, `faramesh approvals list` shows every deferred call. Promote the rules that should be permanent, deny the ones that shouldn't exist, then `faramesh apply` again.

## 2. Change policy

You're tightening a rule, raising a budget, or adding a new provider.

```bash title="Terminal"
# edit governance.fms
faramesh check
faramesh plan
faramesh apply
```

`faramesh plan` shows the decision delta against recent traffic, useful when you're not sure whether a rule change will block something legitimate. Sample output:

```
Rule changes:
  ~ permit stripe/charge if amount < $500  →  if amount < $250
  + deny   stripe/payouts

Decision impact (last 24h):
  stripe/charge  permit → deny    3 calls (1.2%)
  stripe/payouts permit → deny    0 calls
```

`apply` hot-swaps policy in-place. There's no daemon restart and in-flight calls keep their pre-swap rule set until they finish.

To roll back:

```bash title="Terminal"
faramesh rollback
faramesh rollback --to v17    # specific WAL version
```

## 3. Monitor

You're watching production.

```bash title="Terminal"
faramesh status
faramesh approvals list
faramesh audit tail --effect deny
faramesh explain <action-id>
faramesh audit verify
```

| Command | Use case |
|---------|----------|
| `status` | Are budgets healthy? Is the daemon caught up? |
| `approvals list` | What needs a human decision right now? |
| `audit tail` | Stream denies in real time for a security review. |
| `explain` | One specific call, which rule fired, what arguments, which provider response. |
| `audit verify` | Walk the WAL hash chain end-to-end. Detects tampering. |

For machine consumers, every command accepts `--format json`.

## Common variations

### Audit mode rollout

Before enforcing a new rule, run it in audit mode:

```hcl title="governance.fms"
runtime { mode = "audit" }
```

Faramesh logs decisions without blocking. Watch `faramesh audit tail` and the `faramesh plan` decision diff. When the diff looks right, switch `mode` back to `enforce` and apply.

### Phased rollout

For a specific rule, use the `phase` block:

```hcl title="governance.fms"
phase "audit-stripe-payouts" {
  duration = "48h"
  next     = "enforce"
  tools    = ["stripe/payouts"]
  rules { permit stripe/payouts }
}
```

After 48 hours the rule auto-promotes to `enforce` and any matching action denies.

### Air-gapped change

In environments without registry access:

```bash title="Terminal"
faramesh bundle --include-providers --out bundle.tar
# transfer to air-gapped host
faramesh apply --offline --bundle bundle.tar
```

## What's next

- [CLI](/cli/): every command and flag
- [Stack reference](/stack/): what you can change in `governance.fms`
- [Run locally](/cli/dev/): try changes before applying
