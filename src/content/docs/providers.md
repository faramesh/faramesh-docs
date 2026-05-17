---
title: Which built-in providers exist?
---

| Provider | Required config |
|----------|-----------------|
| vault | `type`, `addr`, `token` (env), `mount`, optional `namespace` |
| aws-sm | `type`, `region`, optional `role_arn` |
| gcp-sm | `type`, `project` |
| azure-kv | `type`, `vault_url`, `tenant_id`, `client_id`, `client_secret` (env) |
| spiffe | `type`, `socket`, `trust_domain` |

Audit sinks: `splunk-sink`, `datadog-sink`, `elastic-sink`, `s3-sink`, `gcs-sink`.

Next: [FPL](/fpl/).
