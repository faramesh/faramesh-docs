---
title: Installation
description: All ways to install and run Faramesh Core.
---

The checked-in runtime is a Go service with SDK adapters, but the docs and README still treat the source-checkout flow as the primary local install.

## Docker Compose

The repository ships a sidecar-style example in `deploy/docker-compose/docker-compose.example.yml`. The topology is simple: one `faramesh` service runs `serve`, a sibling agent container shares the Unix socket volume, and both attach to the same runtime state.

```yaml
services:
  faramesh:
    command:
      - serve
      - --policy
      - /policy/policy.yaml
      - --socket
      - /run/faramesh/faramesh.sock
```

## Bare metal / Python

The Python SDK resolves its base URL and token from environment or `configure()`:

```python
from faramesh import configure
configure(base_url="http://localhost:8000", token="dev-token")
```

Relevant env vars from the checked-in SDK and daemon include `FARAMESH_BASE_URL`, `FARAMESH_TOKEN`, `FARAMESH_RETRIES`, `FARAMESH_RETRY_BACKOFF`, `FARAMESH_SOCKET`, `FARAMESH_POLICY_ADMIN_TOKEN`, `FARAMESH_STANDING_ADMIN_TOKEN`, `FARAMESH_SPIFFE_ID`, and `FARAMESH_CREDENTIAL_VAULT_ADDR`.

## SDK only

When you are pointing at a remote instance, install the SDK and set the remote endpoint:

```bash
pip install faramesh
npm install @faramesh/sdk
```

## Verify

The HTTP proxy adapter exposes `/healthz`, which returns `{"status":"ok"}`. The docs site’s later reference pages cover the other protocol surfaces that are available in the tree.

## Requirements

The checked-in code paths assume Python 3.9+ on the SDK side and a Go runtime with either SQLite or PostgreSQL-backed persistence in production. See [Database Setup](/deployment/database/) and [Configuration Reference](/deployment/configuration/).

## Next

Read [Your First Policy](/getting-started/your-first-policy/) and [Self-Hosted Deployment](/deployment/self-hosted/).
