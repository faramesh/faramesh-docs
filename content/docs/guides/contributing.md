---
title: Contributing to Faramesh
description: Monorepo map, architecture trees, and how to open PRs across core, docs, SDKs, and registry.
---

Faramesh is split across several GitHub repositories in the [faramesh](https://github.com/faramesh) org. This guide is for contributors who need to change more than one repo or trace a feature end-to-end.

## Repository map

| Repository | Role | Primary language |
|------------|------|------------------|
| [faramesh-core](https://github.com/faramesh/faramesh-core) | CLI, daemon, policy engine, proxies, seccomp/eBPF | Go |
| [faramesh-docs](https://github.com/faramesh/faramesh-docs) | docs.faramesh.dev (this site) | TypeScript / MDX |
| [faramesh-registry](https://github.com/faramesh/faramesh-registry) | Signed catalog (providers, policies, frameworks) | FPL + JSON |
| [faramesh-python-sdk](https://github.com/faramesh/faramesh-python-sdk) | PyPI `faramesh` package | Python |
| [faramesh-typescript-sdk](https://github.com/faramesh/faramesh-typescript-sdk) | npm `@faramesh/sdk` | TypeScript |

Local clones often live in one parent folder (e.g. `Faramesh-Nexus/`) for convenience; each repo still has its own CI and release cadence.

## faramesh-core layout

```text
faramesh-core/
├── cmd/faramesh/          # CLI commands (init, dev, check, plan, apply, serve, …)
├── internal/
│   ├── daemon/            # serve lifecycle, WAL replay, socket server
│   ├── core/              # pipeline, policy engine, denial codes, sandbox/seccomp
│   ├── adapter/           # SDK socket, MCP/HTTP proxy, gRPC gateway
│   ├── security/          # config immutability (chattr/uchg)
│   └── devmode/           # zero-infra stubs for faramesh dev
├── sdk/python/            # in-tree Python shim (published from faramesh-python-sdk)
├── tests/                 # e2e scripts (e.g. e2e_zero_governed.sh)
└── docs/internal/         # FARAMESH.md spec (not the public docs site)
```

**Data flow:** `governance.fms` → `faramesh check` / `plan` → `faramesh apply` writes `.faramesh/governance.compiled.json` → `faramesh serve --from-compiled` → agents connect via Unix socket / proxies.

## faramesh-docs layout

```text
faramesh-docs/
├── content/docs/          # MDX pages (meta.json defines sidebar order)
├── lib/shared.ts          # gitConfig → header links to faramesh-core
└── app/                   # Next.js / Fumadocs routes
```

Doc changes do not require a core release unless you document new flags or denial codes that are not yet shipped.

## SDK and registry

- **Python / Node SDKs** — transport (`govern` RPC), `GovernedToolSet`, `ToolDeniedException` / structured denials. Version with daemon socket protocol; bump minor when denial schema changes.
- **Registry** — `catalog/catalog.json`, `catalog/trust/keys.json`, `make sign-catalog`. CI validates signatures with `REGISTRY_SIGNING_KEY_B64` (see [SIGNING_KEY_LOCATION](https://github.com/faramesh/faramesh-registry/blob/main/SIGNING_KEY_LOCATION.md)).

## PR workflow

1. **Fork + branch** on the repo you are changing (`feat/…` or `fix/…`).
2. **Core changes** — `go test ./...` from `faramesh-core`; run `tests/e2e_zero_governed.sh` for dev/apply paths.
3. **Docs** — `npm run build` in `faramesh-docs`; link new CLI pages in `content/docs/meta.json`.
4. **Registry** — `./scripts/validate-catalog.sh` after manifest or signature changes.
5. **Cross-repo features** — open PRs in dependency order (core → SDKs → registry catalog → docs). Reference sibling PR URLs in descriptions.

## Signing key rotation (registry maintainers)

From the **root of a cloned `faramesh-registry` repo** (not a parent monorepo path):

```bash
gh secret set REGISTRY_SIGNING_KEY_B64 \
  --repo faramesh/faramesh-registry \
  --body "$(cat .secrets/REGISTRY_SIGNING_KEY_B64)"
```

Paste the single-line base64 private key if prompted. Update `catalog/trust/keys.json` and docs trust blocks when the public key changes.

## Related pages

- [Security model](/security/)
- [Architecture](/concepts/architecture/)
- [CLI reference](/cli/)
