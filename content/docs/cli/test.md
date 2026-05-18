---
title: faramesh test
description: Replay policy fixtures against the compiled engine. Assert decisions for known tool calls in CI and locally.
---

`faramesh test` runs **policy fixtures** — recorded or hand-written tool calls with expected decisions — against the compiled policy. It's how you write unit tests for `governance.fms` and how you make sure a policy refactor doesn't silently change a decision.

Use it locally while iterating, and in CI on every PR.

## Usage

```bash title="Terminal"
faramesh test [--dir DIR] [--fixture FILE] [--fail-fast] [--update]
```

| Flag | Description |
|------|-------------|
| `--dir DIR` | Stack directory. Defaults to the current directory. |
| `--fixture FILE` | Run a single fixture file (otherwise globs `tests/*.fmtest.json` under the stack). |
| `--fail-fast` | Stop on the first mismatch. |
| `--update` | Update fixtures' `expected` fields to match actual decisions. **Use carefully** — it rewrites your tests. |

## Fixture format

A fixture is a JSON file describing one or more tool calls and the expected decision for each:

```json title="tests/refunds.fmtest.json"
{
  "fixture":  "refunds",
  "agent_id": "support-bot",
  "cases": [
    {
      "name":    "small refund permits",
      "tool":    "stripe/refund",
      "args":    { "amount": 80, "card_number": "4242…" },
      "expect":  { "effect": "PERMIT", "rule_ref": "governance.fms:14" }
    },
    {
      "name":    "large refund defers",
      "tool":    "stripe/refund",
      "args":    { "amount": 8000 },
      "expect":  { "effect": "DEFER" }
    },
    {
      "name":    "payouts always deny",
      "tool":    "stripe/payouts",
      "args":    { "amount": 100 },
      "expect":  { "effect": "DENY", "code": "POLICY_DENY" }
    }
  ]
}
```

Fields:

| Field | Required | Description |
|-------|:---:|-------------|
| `agent_id` | ✓ | Matches an `agent "<id>" { … }` in `governance.fms`. |
| `cases[].tool` | ✓ | Tool name as the SDK would send. |
| `cases[].args` | — | Action payload. Conditions evaluate against this. |
| `cases[].expect.effect` | ✓ | `PERMIT`, `DEFER`, or `DENY`. |
| `cases[].expect.code` | — | Optional denial code (`POLICY_DENY`, `RATE_EXCEEDED`, …). |
| `cases[].expect.rule_ref` | — | Optional rule reference (file:line). Helps catch silent rule reordering. |
| `cases[].principal` | — | Override `principal.*` claims for this case. |

## Output

```text title="Output"
$ faramesh test
Compiling governance.fms ... ok
Running 3 fixtures, 12 cases ...

  refunds
    ✓ small refund permits
    ✓ large refund defers
    ✗ payouts always deny
        expected: DENY (POLICY_DENY)
        got:      PERMIT (matched rule governance.fms:11)
        diff:     rule re-ordering allowed payouts unexpectedly

  budgets
    ✓ daily under cap
    ✓ daily at warning threshold

  egress
    ✓ allowed host
    ✓ denied host

11 passed, 1 failed
```

A failed test prints the expected and actual decisions plus a one-line explanation when one is obvious.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | All cases pass. |
| `1` | At least one case failed. |
| `2` | Compile failed (same family as `check`). |

## CI integration

```yaml title=".github/workflows/policy.yml"
- run: faramesh check --strict
- run: faramesh test
- run: faramesh plan --format json > plan.json
```

`test` runs against the compiled AST in your repo — it doesn't need a running daemon and doesn't write to the WAL.

## Recording fixtures from real traffic

For complex stacks, hand-writing fixtures is tedious. You can record them from a running daemon instead:

```bash title="Terminal"
faramesh test record --since 1h --out tests/recorded.fmtest.json
```

This pulls every decision from the WAL in the time window, normalizes the args, and writes a fixture with the actual decisions as `expected`. Then commit the file. Future `faramesh test` runs will fail if any of those decisions change.

## Updating fixtures after a policy change

If you intentionally changed a rule and need to update the expected decisions:

```bash title="Terminal"
faramesh test --update
```

Diffs are printed before the rewrite so you can review them. Treat `--update` like committing test snapshots — review the diff before pushing.

## Difference from `faramesh plan`

| Command | What it does |
|---------|--------------|
| `faramesh test` | Asserts known cases produce known decisions. **Fails the build on regression.** |
| `faramesh plan` | Reports diffs and replay deltas. **Does not fail** on legitimate changes. |

Use both: `test` for the cases you care about, `plan` for the rest of history.

## What's next

- [`faramesh check`](/cli/check/) — the cheaper validator.
- [`faramesh plan`](/cli/plan/) — replay against history.
- [Workflows](/flows/) — putting `check` + `test` + `plan` + `apply` together in CI.
- [Debugging denials](/guides/debugging-denials/) — what to do when a test fails.
