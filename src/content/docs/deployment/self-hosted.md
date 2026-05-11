---
title: Self-Hosted Deployment
description: Running Faramesh Core on your own infrastructure.
---

The self-hosted deployment is the core runtime plus the adapters that sit around it: the SDK socket protocol, the HTTP proxy adapter, the MCP gateway, and the local web/dashboard flow.

The minimum production shape is a policy file, a daemon process, persistent storage, and whatever executors your agents actually need. The checked-in compose example uses a sidecar pattern with a shared Unix socket volume; the server flags also expose PostgreSQL mirroring, Redis-backed deferrals, TLS, metrics, OTLP, and strict preflight checks.

:::tip
If you are starting from a local checkout, read the sidecar example first and then layer in your real storage and credential backend.
:::

See [Docker Compose Deployment](/deployment/docker-compose/), [Configuration Reference](/deployment/configuration/), and [Database Setup](/deployment/database/).
