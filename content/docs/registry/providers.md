---
title: Using registry providers
description: Import signed provider binaries from the GitHub catalog and wire them in governance.fms.
---

Providers are **signed executables** that implement `ProviderService` over gRPC. Faramesh runs them as sidecars and never embeds cloud SDKs in the daemon.

## Import and declare

```hcl title="governance.fms"
import "github.com/faramesh/faramesh-registry/providers/faramesh/vault@1.0.0"

provider "vault" {
  type  = "vault"
  addr  = env("VAULT_ADDR")
  token = env("VAULT_TOKEN")
  mount = "secret"
}
```

Run `faramesh apply` to download the binary for your platform into `.faramesh/providers/`.

## Available providers (official catalog)

| Provider | Capability | Production use |
|----------|------------|----------------|
| `faramesh/vault` | Secrets | Yes — HashiCorp Vault KV |
| `faramesh/spiffe` | Identity | Yes — SPIRE workload attestation |
| `faramesh/dev-kms` | KMS | **Dev only** — ephemeral keys |

See [Providers reference](/providers/) for field-level configuration.

## Verification

- Manifest `sha256_hex` must match the downloaded binary.
- Detached `.sig` files are checked when present.
- Your `trust { ... }` block must include the catalog signing key.

## Custom providers

Implement the provider interface in Go, build per-platform binaries, add a `manifest.json` under `catalog/artifacts/providers/`, and open a PR to the catalog repo. See [Publishing](/registry/publish/).
