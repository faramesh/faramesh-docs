---
title: faramesh check
description: Validate governance.fms, parse, type-check, resolve imports, verify provider references, without starting the daemon.
---

`faramesh check` is the command you run **every time you edit `governance.fms`**. It parses the file, resolves registry imports, verifies provider references, checks `env()` resolutions, and reports schema or type errors with file and line. It does not start the daemon, write any state, or contact the network unless an import requires resolution.

You'll wire this into pre-commit hooks and CI. It's the cheapest gate before `faramesh plan` and `apply`.

## Usage

```bash title="Terminal"
faramesh check [--dir DIR] [--strict] [--offline]
```

| Flag | Description |
|------|-------------|
| `--dir DIR` | Stack directory. Defaults to the current directory. |
| `--strict` | Fail on warnings as well as errors (recommended in CI). |
| `--offline` | Don't fetch imports; require everything to be resolved locally. |

## What gets validated

| Check | Failure mode |
|-------|--------------|
| FPL syntax | `governance.fms:12: expected 'permit', 'defer', 'deny', got 'pemit'` |
| Block schema | `agent "support": unknown field 'rate_limts' (did you mean 'rate_limit'?)` |
| Tool patterns | `rate_limit "stripe/charge": pattern must end in '/*' or be a bare name` |
| Conditions | `if amount < $500 and curency == "USD": unknown field 'curency'` |
| `env()` references | `provider "vault": env("VAULT_TOKEN") is unset` (only with `--strict-env`) |
| Imports | `import "...@1.2.3": pinned version not found in registry` |
| Trust roots | `trust { key ... }: signature mismatch in provider X@1.0.0` |
| Default effect | `agent "support" has rules but no 'default deny|permit'` (warning) |
| Conflicts | `permit refund and deny refund both match — first match wins; verify ordering` |

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Valid. Prints `✓ governance.fms valid`. |
| `1` | Syntax or schema error. The file and line are printed. |
| `2` | Import unreachable (network, missing version, signature failure). |
| `3` | `--strict` warnings present. |

## Output

Successful run:

```text title="Output"
$ faramesh check
✓ imports resolved (3)
✓ providers verified (vault, kms, splunk)
✓ trust roots loaded (1)
✓ governance.fms valid
```

Failure:

```text title="Output"
$ faramesh check
✗ governance.fms:18: agent "support-bot": rate_limit "stripe/*": expected 'per <window>'
   17 |   rate_limit "stripe/charge": 5 per minute
 > 18 |   rate_limit "stripe/refund": 5 minute
   19 | }
```

The error includes the offending source span and a suggestion when one is obvious.

## What `check` does NOT do

- It doesn't talk to the daemon.
- It doesn't replay decisions against history (that's [`faramesh plan`](/cli/plan/)).
- It doesn't verify that `env()` values resolve at runtime. Those are checked at `apply` time unless you pass `--strict-env`.
- It doesn't download provider binaries (that's `apply`).

## Recommended use

In a pre-commit hook:

```bash title=".git/hooks/pre-commit"
#!/bin/sh
faramesh check --strict
```

In CI:

```yaml title=".github/workflows/policy.yml"
- run: faramesh check --strict
- run: faramesh plan --format json > plan.json
- uses: actions/upload-artifact@v4
  with: { name: faramesh-plan, path: plan.json }
```

## What's next

- [`faramesh plan`](/cli/plan/): see what would change at apply.
- [`faramesh apply`](/cli/apply/): compile and start enforcing.
- [FPL reference](/fpl/): full grammar and conditions.
- [Stack reference](/stack/): block-by-block semantics.
