---
title: Configuration Reference
description: Environment variables and configuration options for Faramesh Core.
---

The checked-in source reads configuration from both CLI flags and environment variables. The most visible groups are:

- SDK connection settings: `FARAMESH_BASE_URL`, `FARAMESH_TOKEN`, `FARAMESH_RETRIES`, `FARAMESH_RETRY_BACKOFF`, `FARAMESH_SOCKET`, `FARAMESH_AGENT_ID`
- daemon/runtime settings: `FARAMESH_POLICY_ADMIN_TOKEN`, `FARAMESH_STANDING_ADMIN_TOKEN`, `FARAMESH_SPIFFE_ID`, `FARAMESH_ENABLE_EBPF`, `FARAMESH_STRICT_PREFLIGHT`
- credential backends: `VAULT_ADDR`, `VAULT_TOKEN`, `FARAMESH_CREDENTIAL_VAULT_ADDR`, `FARAMESH_CREDENTIAL_VAULT_TOKEN`, `FARAMESH_CREDENTIAL_ALLOW_ENV_FALLBACK`
- integration hooks: `FARAMESH_MCP_EDGE_AUTH_BEARER_TOKEN`, `FARAMESH_INTENT_CLASSIFIER_BEARER_TOKEN`, `FARAMESH_SLACK_WEBHOOK`

The `serve` command also accepts a long list of flags for sockets, policy loading, proxy mode, OTLP, metrics, DPR storage, and credential brokers. Use the CLI help output for the exact flag surface in the version you are running.

See [Environment Variables](/reference/environment-variables/) for the broader list and [Installation](/getting-started/installation/) for the practical startup path.
