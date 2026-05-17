---
title: Registry
description: GitHub-hosted catalog of signed providers, policy packs, and framework profiles for governance.fms.
---

The Faramesh catalog lives on GitHub: [github.com/faramesh/faramesh-registry](https://github.com/faramesh/faramesh-registry). The CLI resolves pinned imports at `faramesh check` and downloads provider binaries at `faramesh apply`. No separate registry website is required.

## Artifact kinds

| Kind | What it is | Example import |
|------|------------|----------------|
| **Provider** | Signed gRPC sidecar binary | `providers/faramesh/vault@1.0.0` |
| **Policy pack** | Versioned FPL rules | `policies/faramesh/stripe@1.0.0` |
| **Framework profile** | FPL wiring for one runtime tier | `frameworks/langgraph@1.0.0` |

## Import syntax

```hcl title="governance.fms"
import "github.com/faramesh/faramesh-registry/frameworks/langgraph@1.0.0"
import "github.com/faramesh/faramesh-registry/policies/faramesh/stripe@1.0.0" as stripe_rules
import "github.com/faramesh/faramesh-registry/providers/faramesh/vault@1.0.0"
```

- Pinned semver is required (`@latest` is rejected).
- Optional `as <alias>` for policy packs.
- Browse the catalog: `faramesh registry list` and `faramesh registry search <term>`.

## Trust

```hcl title="governance.fms"
trust {
  key "github.com/faramesh/faramesh-registry" ed25519:nxNjaQnS3L+zzKrRq48XfYBDWlFXkNJkxUiTD8j0sFs=
}
```

`faramesh init` can write the official trust root. Add keys for forks or internal mirrors you operate.

## Guides

- [Catalog overview](/registry/overview/)
- [Using providers](/registry/providers/)
- [Policy packs](/registry/policies/)
- [Framework profiles](/registry/frameworks/)
- [Versioning and pins](/registry/versioning/)
- [Publishing your own](/registry/publish/)

## Offline and air-gapped

`faramesh bundle` packs resolved imports for environments without GitHub access. See [Flows](/flows/).
