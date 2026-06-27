---
title: Deploying Faramesh at scale
description: Topologies, fleet operations, catalog mirrors, and production posture for platform teams.
---

Platform engineers run Faramesh **beside** agents not inside the model API path. This guide covers how to roll out stacks safely across many hosts.

## Deployment patterns

| Topology | When |
|----------|------|
| Sidecar daemon per pod | Kubernetes agents (one stack per workload) |
| Shared daemon per node | Multiple agents on same VM |
| CI gate | `faramesh check` on every `governance.fms` PR |
| Bundle + air-gap | `faramesh bundle` into regulated networks |

See [Topologies](/concepts/topologies/) for diagrams and trade-offs.

## Catalog distribution

Default: CLI pulls from [github.com/faramesh/faramesh-registry](https://github.com/faramesh/faramesh-registry).

| Environment | Pattern |
|-------------|---------|
| Internet egress allowed | No config (GitHub default) |
| Mirror required | Internal git mirror + `FARAMESH_REGISTRY_ROOT` |
| HTTP internal | Run catalog `cmd/registry`, set `FARAMESH_REGISTRY_URL` |

Pin `FARAMESH_REGISTRY_GITHUB_REF` to a release tag for immutable rollouts.

## Operations checklist

1. **Bootstrap**: `faramesh init` in golden templates; store stack in git.
2. **CI**: `faramesh check` + `faramesh plan` on PRs; block merge on failure.
3. **CD**: `faramesh apply` in deployment pipeline; restart daemon with compiled artifact.
4. **Secrets**: vault/SPIFFE providers; no long-lived keys in agent env.
5. **Observability**: scrape daemon health; ship DPR to log pipeline.
6. **Upgrades**: bump import pins in staging; run integration tests; promote.

## Fleet visibility

For fleet visibility, forward DPRs and health signals to your observability and audit systems. Keep enforcement local and keep the daemon WAL as the source of truth.

## Related

- [CLI reference](/cli/)
- [Registry versioning](/registry/versioning/)
- [Dev mode](/cli/dev/) for local parity
