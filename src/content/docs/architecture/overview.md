---
title: Architecture Overview
description: How Faramesh is structured internally.
---

The README’s architecture is straightforward: agents propose actions, the governance runtime decides, executors only run allowed work, and storage holds the evidence chain.

```text
Agent -> Faramesh API Server + Policy Engine -> Executors / Tools
              |                        |
              v                        v
        Storage / DB              Web UI / CLI
```

The checked-in tree exposes three major adapter families:

- SDK/socket governance for direct agent integrations
- HTTP proxy and MCP gateway for external tool surfaces
- CLI and dashboard flows for policy, audit, and approval operations

See [Request Lifecycle](/architecture/request-lifecycle/) and [Storage Model](/architecture/storage-model/).
