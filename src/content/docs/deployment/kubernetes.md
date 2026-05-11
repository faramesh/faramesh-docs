---
title: Kubernetes Deployment
description: Deploying Faramesh Core on Kubernetes.
---

The repository includes a Kubernetes sidecar deployment example. The shape is the same as the compose flow: a daemon sidecar governs the agent container through a shared runtime boundary.

Use Kubernetes Secrets for credentials, a persistent volume for the runtime database when you need local persistence, and standard readiness/liveness checks for the daemon and UI.

If you are routing through the HTTP proxy or MCP gateway, keep the gateway endpoints behind a service boundary and only expose the ports you actually need.

See [Self-Hosted Deployment](/deployment/self-hosted/) and [Configuration Reference](/deployment/configuration/).
