---
title: Environment Variables
description: Environment variables read by the checked-in runtime and SDKs.
---

The repo reads a wide set of environment variables. The most visible ones in the checked-in source are:

```text
FARAMESH_BASE_URL
FARAMESH_TOKEN
FARAMESH_RETRIES
FARAMESH_RETRY_BACKOFF
FARAMESH_SOCKET
FARAMESH_AGENT_ID
FARAMESH_POLICY_ADMIN_TOKEN
FARAMESH_STANDING_ADMIN_TOKEN
FARAMESH_SPIFFE_ID
FARAMESH_IDP_PROVIDER
FARAMESH_CREDENTIAL_ALLOW_ENV_FALLBACK
FARAMESH_CREDENTIAL_VAULT_ADDR
FARAMESH_CREDENTIAL_VAULT_TOKEN
FARAMESH_CREDENTIAL_AWS_REGION
FARAMESH_CREDENTIAL_GCP_PROJECT
FARAMESH_CREDENTIAL_AZURE_VAULT_URL
FARAMESH_SLACK_WEBHOOK
FARAMESH_PAGERDUTY_ROUTING_KEY
FARAMESH_MCP_EDGE_AUTH_BEARER_TOKEN
FARAMESH_ENABLE_EBPF
FARAMESH_STRICT_PREFLIGHT
```

Most of these map to a daemon flag or an SDK configuration field. The important pattern is consistent: explicit config wins, env is the fallback, and the runtime keeps the control plane settings close to the process that actually enforces them.

See [Configuration Reference](/deployment/configuration/) and [Installation](/getting-started/installation/).
