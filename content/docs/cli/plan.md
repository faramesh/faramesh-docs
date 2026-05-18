---
title: faramesh plan
description: Preview compile and runtime changes before apply. Diff against the live daemon's policy and replay against the last 24 hours of decisions.
---

`faramesh plan` is the **dry-run** command. It compiles `governance.fms`, computes a diff against the currently-applied policy, and replays the last 24 hours of WAL decisions against the new policy to tell you what would change. Use it before every production `apply` and in CI.

This is the command that catches "I tightened a rule, here's how many calls would have been denied last week."

## Usage

```bash title="Terminal"
faramesh plan [--dir DIR] [--format text|json] [--since DURATION]
```

| Flag | Description |
|------|-------------|
| `--dir DIR` | Stack directory. Defaults to the current directory. |
| `--format text \| json` | Output format. `json` is stable and machine-readable. |
| `--since DURATION` | History window to replay. Default `24h`. Use `7d` for weekly, `30m` for narrow checks. |

## What `plan` shows

The output is grouped into three sections:

### 1. Policy diff (vs. last apply)

What changed at the AST level:

```text title="Output"
=== Policy diff ===
+ rule  permit search_docs
~ rule  defer  send_email
        old: permit send_email if args.to matches "@example.com$"
        new: defer  send_email
- rule  permit charge_card if amount < $50
+ rate_limit "stripe/*": 10 per minute
~ budget daily.max
        old: $500
        new: $1000
+ provider "kms"
```

Symbols:
- `+` added
- `-` removed
- `~` changed (old → new)

### 2. Decision replay (history under the new policy)

Replay the WAL against the new AST and report counts:

```text title="Output"
=== Decision replay (last 24h, 1,432 calls) ===
  unchanged    1,403  (98.0%)
  permit→defer    27  (1.9%)   send_email × 27
  permit→deny      2  (0.1%)   stripe/charge × 2 (amount > new $50 limit)
  defer →permit    0
  deny  →permit    0
```

This is the most important section before a production apply. It tells you exactly how the new policy would have changed real history.

### 3. Provider and infrastructure deltas

```text title="Output"
=== Provider changes ===
+ provider "splunk-sink"  (new audit sink, will start at apply)
~ provider "vault"        (config changed, daemon will reconnect)

=== Runtime ===
~ runtime.os_tier            false → true        (will require .faramesh/bin/agent)
~ runtime.cold_start_grace   "5s"  → "10s"
```

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Compile succeeded. Plan is printed (regardless of how big the diff is). |
| `1` | Compile failed (same family as `check`). |
| `2` | Compile succeeded but `--strict-replay` was set and replay shows changes. |

For CI, `0` means "safe to proceed to apply"; non-zero blocks the merge.

## JSON output

`plan --format json` produces a stable schema usable in PR-comment automation:

```json title="plan.json"
{
  "version": "v1",
  "diff": {
    "rules":     { "added": [...], "removed": [...], "changed": [...] },
    "rate_limits": { ... },
    "budgets":   { ... },
    "providers": { ... }
  },
  "replay": {
    "window":     "24h",
    "total":      1432,
    "transitions": {
      "permit_to_defer": [{ "tool": "send_email", "count": 27 }],
      "permit_to_deny":  [{ "tool": "stripe/charge", "count": 2 }]
    }
  }
}
```

## When to run `plan`

- **In CI** on every PR that touches `governance.fms`. Block merge on non-zero exit.
- **Before production apply.** Always.
- **Before flipping `mode = "audit"` to `"enforce"`.** The replay shows you what would have been blocked.
- **When tuning rate limits or budgets.** Replay confirms the new ceiling doesn't catch legitimate traffic.

## What `plan` does NOT do

- It doesn't change the running daemon.
- It doesn't write to the WAL.
- It doesn't contact providers (compile-time only; provider checks happen at `apply`).
- It can't predict effects on traffic patterns that haven't happened yet. Only replay history.

## Common scenarios

### "I tightened a rule. Will it break the agent?"

`plan` will show you `permit→defer` or `permit→deny` transitions. If the count is non-zero, decide: ship the rule (defers create approvals you'll review), or reverse the change.

### "I'm flipping audit → enforce."

`plan --since 7d` against a week of audit-mode traffic gives you the deny count under enforce. If that number is too high, your policy needs more `defer` ladders before promotion.

### "I'm rolling out a new framework profile via import."

The diff section shows every rule the import added. Skim it before merging. Registry imports can ship many rules.

## What's next

- [`faramesh apply`](/cli/apply/): apply the change to the running daemon.
- [`faramesh check`](/cli/check/): the cheaper, no-replay validator.
- [Workflows](/flows/): the day-to-day flow including `plan` in CI.
- [Rolling out a stricter policy](/guides/your-first-policy/): when to use `audit` mode + `plan` before flipping to `enforce`.
