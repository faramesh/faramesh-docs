---
title: Docker Compose Deployment
description: The fastest path to a production-ready Faramesh deployment.
---

The checked-in compose example is a two-service topology: `faramesh` and `agent` share a Unix socket volume. The daemon starts with `serve --policy /policy/policy.yaml --socket /run/faramesh/faramesh.sock`.

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

This layout keeps the decision service separate from the agent process while still giving the agent a local, low-latency transport.

Scale by replicating the executor side of the stack, not by giving agents direct access to the tools. Persist runtime state in the configured data directory and move to PostgreSQL if you need mirrored DPR writes.

See [Self-Hosted Deployment](/deployment/self-hosted/) and [Database Setup](/deployment/database/).
