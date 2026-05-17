---
title: Catalog overview
description: How the GitHub catalog is organized and how the CLI resolves imports.
---

The catalog is a Git repository. The index file `catalog/catalog.json` lists every provider, policy pack, and framework profile with version paths into `catalog/artifacts/`.

## Resolution flow

1. **`faramesh check`** — Fetches FPL for policy and framework imports from GitHub (or `FARAMESH_REGISTRY_ROOT`), verifies signatures when present, merges into your stack AST.
2. **`faramesh apply`** — Downloads the provider binary for your OS/architecture, verifies `sha256` and optional Ed25519 signature, installs under `.faramesh/providers/`.

Default source: `https://raw.githubusercontent.com/faramesh/faramesh-registry/main/...`

## Overrides

| Variable | Effect |
|----------|--------|
| *(none)* | GitHub catalog, branch `main` |
| `FARAMESH_REGISTRY_ROOT` | Local clone of the catalog repo |
| `FARAMESH_REGISTRY_URL` | HTTP registry (`go run ./cmd/registry` in the catalog repo) |
| `FARAMESH_REGISTRY_GITHUB_REF` | Pin a tag or commit instead of `main` |

## Browse from the CLI

```bash
faramesh registry list
faramesh registry list --kind policy
faramesh registry search stripe
faramesh registry info frameworks/langgraph@1.0.0
```

## Official catalog contents

See the live index on GitHub: [catalog/catalog.json](https://github.com/faramesh/faramesh-registry/blob/main/catalog/catalog.json).

**Providers:** `faramesh/vault` and `faramesh/spiffe` are intended for production use (with your Vault/SPIRE). `faramesh/dev-kms` is dev-only.

**Policy packs:** `stripe` and `shell` are substantive starter packs. `openai`, `github`, and `mcp` are baselines you should review and extend before production.

**Framework profiles** are short FPL fragments (typically under 15 lines) that set the framework id and default posture — that is expected, not incomplete packaging.
