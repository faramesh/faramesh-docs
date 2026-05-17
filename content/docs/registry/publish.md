---
title: Publish to the catalog
description: Contribute providers, policy packs, and framework profiles via GitHub.
---

Publishing is **GitOps**: artifacts live in the [faramesh-registry](https://github.com/faramesh/faramesh-registry) repository (or your fork).

## Policy pack or framework profile

1. Copy an existing artifact directory under `catalog/artifacts/`.
2. Edit `policy.fpl` or `profile.fpl` (FPL is canonical).
3. Add an entry to `catalog/catalog.json` with `trust_tier: "community"` unless you are an official maintainer.
4. Run `./scripts/validate-catalog.sh` locally.
5. Open a pull request.

Maintainers with `REGISTRY_SIGNING_KEY_B64` run `go run ./cmd/sign-catalog -catalog catalog` to produce `.sig` sidecars.

## Provider binary

1. Implement under `providers/<name>/` using existing Vault/SPIFFE providers as templates.
2. Add the name to `Makefile` `PROVIDERS`.
3. `make providers` and `./scripts/refresh-provider-hashes.sh`.
4. Add `manifest.json` and catalog index entry.
5. `make sign-all` (maintainers) and PR.

## Distribute without merging upstream

Consumers can use your fork directly:

```bash
git clone https://github.com/<you>/faramesh-registry
export FARAMESH_REGISTRY_ROOT=$PWD/faramesh-registry
```

They must add your publisher key to `trust { ... }` in `governance.fms`.

## Optional HTTP mirror

Run `go run ./cmd/registry -catalog catalog` and set `FARAMESH_REGISTRY_URL` for teams that prefer an internal HTTP endpoint backed by the same Git tree.
