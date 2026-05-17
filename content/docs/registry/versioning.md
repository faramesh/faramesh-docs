---
title: Versioning and pins
description: Semver pins, trust keys, and safe upgrades for GitHub catalog artifacts.
---

Every import must include an exact semver: `...@1.0.0`. Floating tags and `@latest` are rejected at `faramesh check`.

## Why pins matter

The daemon evaluates compiled policy. Changing rules or provider binaries without a deliberate pin change would make audits ambiguous. Pins tie a stack to **exact bytes** in the catalog (or your fork).

## Upgrading

1. Browse `catalog/catalog.json` on GitHub for a newer version path.
2. Update the import line in `governance.fms`.
3. Run `faramesh plan` to see compile and provider diffs.
4. Run `faramesh apply` in a staging stack before production.

## Trust keys

When the catalog signing key rotates, add the new Ed25519 public key to `trust { ... }` before removing the old one. Official key material lives in [catalog/trust/keys.json](https://github.com/faramesh/faramesh-registry/blob/main/catalog/trust/keys.json).

## Forks and community artifacts

Community entries should use `trust_tier: "community"` in the catalog and a **separate** trust key. Never import community artifacts without pinning both version and publisher key.
