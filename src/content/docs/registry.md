---
title: Registry
---

The **Faramesh Registry** (`registry.faramesh.dev`) is the official distribution surface for three artifact kinds — **providers**, **policy packs**, and **framework profiles**. They are not interchangeable.

Browse, search, and copy usage snippets from the registry web app (Terraform Registry–style UX). The CLI resolves pinned imports at `faramesh check` / `apply`.

## Import syntax

```fpl
import "registry.faramesh.dev/frameworks/langgraph@1.0.0"
import "registry.faramesh.dev/policies/stripe@1.3.0" as stripe_rules
import "registry.faramesh.dev/providers/vault@2.1.0"
```

`@latest` is rejected at `faramesh check`. Use an explicit semver pin.

## Artifact kinds

| Kind | What it is | Example |
|------|-----------|---------|
| **Provider** | Signed binary (`ProviderService` gRPC) | `faramesh/vault` |
| **Policy pack** | Versioned FPL rules, redaction, rate limits | `faramesh/pci-dss`, `faramesh/stripe` |
| **Framework profile** | FPL wiring for interception tier | `langgraph`, `mcp` |

## Offline

`faramesh bundle` exports a tarball of resolved artifacts for air-gapped stacks. `faramesh init --offline` skips the framework import line.

## Local registry (development)

Run the registry service from the `faramesh-registry` repository:

```bash
go run ./cmd/registry -catalog catalog -listen 127.0.0.1:8787
export FARAMESH_REGISTRY_URL=http://127.0.0.1:8787
faramesh check
```

Service discovery:

```bash
curl -s http://127.0.0.1:8787/.well-known/faramesh.json
```

## Architecture

Implementation lives in **`faramesh-registry/`** (HTTP API R0 shipped; Next.js browse UI planned). Design spec: **FARAMESH_REGISTRY_PLATFORM** in the monorepo `docs/internal/` tree.

Next: [Providers](/providers/) · [FPL](/fpl/) · [Frameworks](/frameworks/)
