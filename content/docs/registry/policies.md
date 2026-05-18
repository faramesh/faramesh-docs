---
title: Policy packs
description: Import versioned FPL rule sets from the GitHub catalog and extend them in your agents.
---

Policy packs are **FPL fragments**: rules, defaults, rate limits, and redactions you import and compose with agent-specific overrides.

## Import

```hcl title="governance.fms"
import "github.com/faramesh/faramesh-registry/policies/faramesh/stripe@1.0.0" as stripe_rules

agent "payments-bot" {
  use stripe_rules {
    refund_threshold   = 500
    charge_threshold   = 2000
  }
  rules {
    permit stripe/refund when amount <= 100
  }
}
```

Merged at `faramesh check`; explicit agent `rules` take precedence per FPL merge semantics.

## Official packs

| Pack | Purpose |
|------|---------|
| `faramesh/stripe` | Payments and refunds |
| `faramesh/shell` | Shell execution baselines |
| `faramesh/github` | Repo and PR tools |
| `faramesh/openai` | OpenAI API tools |
| `faramesh/mcp` | MCP client defaults |
| `faramesh/demo` | Smoke-test examples |

Inspect source FPL on GitHub under `catalog/artifacts/policies/`.

## Write your own

1. Author `policy.fpl` in a directory layout matching the catalog.
2. Register in `catalog/catalog.json`.
3. Sign with the project Ed25519 key (maintainers) or publish from your fork with your own trust key.
4. Consumers import with a pinned `@version`.

See [Publishing](/registry/publish/) and [FPL reference](/fpl/).
