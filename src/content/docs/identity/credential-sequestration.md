---
title: Credential Sequestration
description: Brokered credential management with Faramesh keeping secrets out of agent process memory.
---

Credential sequestration is Faramesh's security boundary for keeping API keys, database passwords, and other secrets out of agent process memory. Instead of passing credentials as environment variables or config files, Faramesh acts as a broker: the daemon provisions credentials to a secure boundary, and tools fetch them through a controlled interface.

## The Problem It Solves

Without credential sequestration:

```python
import os
os.environ["STRIPE_API_KEY"] = "sk_live_..."  # Secret in agent memory
os.environ["DB_PASSWORD"] = "..."              # Available to entire process
agent.run()
```

An LLM with code execution could read `os.environ`. Data exfiltration becomes trivial.

With credential sequestration:

1. Agent process **never has** the secret
2. Daemon holds the secret in protected memory
3. Tools request credentials through Faramesh API
4. Daemon validates request against policy before issuing credential

## 1. How It Works

### Architecture

```
┌─────────────────────────────────────────┐
│ Agent Process                           │
│ ┌─────────────┐       ┌──────────────┐  │
│ │ LLM Tool    │──────▶│ Faramesh SDK │  │
│ │ (no keys!)  │       │ Client       │  │
│ └─────────────┘       └──────┬───────┘  │
└────────────────────────────────┼─────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ Faramesh Daemon        │
                    │ ┌──────────────────┐   │
                    │ │ Credential Store │   │
                    │ │ (protected mem)  │   │
                    │ └──────────────────┘   │
                    │ ┌──────────────────┐   │
                    │ │ Backend Provider │   │
                    │ │ Vault/AWS/GCP    │   │
                    │ └──────────────────┘   │
                    └───────────────────────┘
```

### Request Flow

1. Tool calls: `faramesh.credential("stripe")`
2. SDK sends signed request to daemon over Unix socket
3. Daemon checks policy: is this tool allowed to use this credential?
4. Daemon fetches credential from backend (or returns cached copy)
5. Daemon returns credential to tool via SDK
6. Tool uses credential; daemon records access in audit log
7. Credential is **never** stored in agent process

### Policy Enforcement

Credential requests are validated against policy before issuing:

```fpl
credential stripe {
  scope refund read_charge
  max_scope "refund:amount<=1000"
}

# Policy can require identity verification
deny stripe/* when principal.verified != true
```

## 2. Setting Up the Credential Daemon

### Enable Credential Brokering

```bash
faramesh credential enable \
  --policy /etc/faramesh/policy.fpl \
  --backend vault \
  --vault-addr https://vault.internal:8200 \
  --vault-token $VAULT_TOKEN
```

### Check Status

```bash
faramesh credential status
faramesh credential vault status
```

### Using with Faramesh Run

```bash
# Agent runs with credential brokering enabled
faramesh run \
  --broker \
  --agent-id payments-prod \
  -- python your_agent.py
```

Agent can now fetch credentials:

```python
from faramesh import credential

stripe_key = credential("stripe", scope="refund")
# Returns actual credential, never stored in env
```

## 3. Backend Providers

### Vault

Enterprise secret management with multi-auth support.

**Setup**:

```fpl
credential stripe {
  backend vault
  path secret/data/stripe/live
  ttl 15m
}
```

**Configuration**:

```bash
faramesh serve \
  --vault-addr https://vault.internal:8200 \
  --vault-token $VAULT_TOKEN \
  --vault-namespace prod
```

**Environment Variables**:
- `FARAMESH_CREDENTIAL_VAULT_ADDR`
- `FARAMESH_CREDENTIAL_VAULT_TOKEN`
- `FARAMESH_CREDENTIAL_VAULT_MOUNT` (default: `secret`)

**Supported Auth Methods**:
- Token (simple)
- AppRole (daemon identity)
- Kubernetes auth (pod identity)
- OIDC (workload identity)

### AWS IAM / Secrets Manager

Native AWS credential provisioning.

**Setup**:

```fpl
credential aws-s3 {
  backend aws
  scope s3:GetObject s3:ListBucket
  ttl 1h
}

credential aws-db {
  backend aws
  scope rds-db:connect
  ttl 4h
}
```

**Configuration**:

```bash
faramesh serve \
  --aws-region us-east-1 \
  --aws-assume-role arn:aws:iam::123456789:role/faramesh-daemon
```

**Environment Variables**:
- `FARAMESH_CREDENTIAL_AWS_REGION`
- `FARAMESH_CREDENTIAL_AWS_ASSUME_ROLE`
- `FARAMESH_CREDENTIAL_AWS_ENDPOINT` (for moto/local testing)

**Scope Format**:
- Secrets Manager: `secretsmanager:GetSecretValue`
- IAM Credentials: `sts:AssumeRole` or `sts:AssumeRoleWithWebIdentity`
- Service-Specific: `s3:GetObject`, `rds-db:connect`, etc.

### GCP (Google Cloud)

Native GCP credential provisioning via workload identity or service accounts.

**Setup**:

```fpl
credential gcp-bigquery {
  backend gcp
  scope bigquery.dataEditor
  ttl 1h
}

credential gcp-storage {
  backend gcp
  scope storage.objectViewer storage.objectCreator
  ttl 1h
}
```

**Configuration**:

```bash
faramesh serve \
  --gcp-project my-project \
  --gcp-service-account daemon@my-project.iam.gserviceaccount.com
```

**Environment Variables**:
- `FARAMESH_CREDENTIAL_GCP_PROJECT`
- `FARAMESH_CREDENTIAL_GCP_SERVICE_ACCOUNT`
- `GOOGLE_APPLICATION_CREDENTIALS` (path to service account JSON)

**Scope Format**: GCP IAM roles (e.g., `bigquery.dataEditor`, `storage.objectViewer`)

### Azure

Native Azure credential provisioning.

**Setup**:

```fpl
credential azure-kv {
  backend azure
  path https://my-vault.vault.azure.net/
  ttl 1h
}
```

**Configuration**:

```bash
faramesh serve \
  --azure-vault-url https://my-vault.vault.azure.net/ \
  --azure-tenant-id $AZURE_TENANT_ID \
  --azure-client-id $AZURE_CLIENT_ID \
  --azure-client-secret $AZURE_CLIENT_SECRET
```

**Environment Variables**:
- `FARAMESH_CREDENTIAL_AZURE_VAULT_URL`
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`

### 1Password

1Password Business account integration.

**Setup**:

```fpl
credential api-keys {
  backend 1password
  path item/uuid/field/credential
  ttl 8h
}
```

**Configuration**:

```bash
export OP_SERVICE_ACCOUNT_TOKEN="$(cat ~/.op/service_account_token)"
faramesh serve --1password-service-account-token $OP_SERVICE_ACCOUNT_TOKEN
```

**Environment Variables**:
- `OP_SERVICE_ACCOUNT_TOKEN`
- `OP_ACCOUNT` (optional vault ID)

### Infisical

Self-hosted secret management platform.

**Setup**:

```fpl
credential app-secrets {
  backend infisical
  path /project/secrets
  ttl 1h
}
```

**Configuration**:

```bash
faramesh serve \
  --infisical-url https://infisical.internal \
  --infisical-project-id proj_abc123 \
  --infisical-access-token $TOKEN
```

**Environment Variables**:
- `FARAMESH_CREDENTIAL_INFISICAL_URL`
- `FARAMESH_CREDENTIAL_INFISICAL_PROJECT_ID`
- `FARAMESH_CREDENTIAL_INFISICAL_ACCESS_TOKEN`

## 4. Credential Blocks in Policy

### Basic Declaration

```fpl
credential stripe {
  scope refund read_charge
  backend vault
  path secret/data/stripe/prod
  ttl 15m
}
```

### Scope Mapping

Scope declarations can use shorthand or full paths:

```fpl
credential stripe {
  # Shorthand: expands to stripe/refund, stripe/read_charge
  scope refund read_charge
}

credential github {
  # Full path: used exactly as-is
  scope repo admin:org_hook
}

credential aws {
  # Multiple formats mixed
  scope s3:ListBucket rds-db:connect
}
```

### Max Scope (Ceiling)

Limit actual scope issued, even if backend grants more:

```fpl
credential stripe {
  scope refund
  max_scope "refund:amount<=5000"  # tool can only refund up to $5000
}

credential aws {
  scope s3:GetObject s3:ListBucket s3:PutObject
  max_scope "s3:GetObject s3:ListBucket"  # restrict to read-only
}
```

**Runtime Effect**:
- Daemon validates tool request matches `max_scope` ceiling
- Request for broader permissions is denied

### TTL (Time-To-Live)

How long credentials are valid before refresh:

```fpl
credential vault-db {
  ttl 1h        # short-lived database passwords
}

credential aws-key {
  ttl 12h       # temporary IAM credentials
}

credential github {
  ttl 24h       # longer-lived app tokens
}
```

## 5. Using Credentials in Policy

Reference credentials in policy expressions:

```fpl
# Gate credential access by identity
deny stripe/* when principal.verified != true

# Combine with budget
defer stripe/refund when args.amount > 1000 && credential == "stripe"

# Phase-based access
phase processing {
  permit stripe/charge
}

phase reporting {
  deny stripe/charge  # can't charge during reporting phase
}
```

## 6. Credential Request Validation

When a tool requests a credential, the daemon verifies:

1. **Policy allows this tool to use this credential**
   ```fpl
   deny stripe/* when principal.verified != true
   ```

2. **Scope ceiling is not exceeded**
   ```fpl
   credential stripe {
     max_scope "refund:amount<=1000"  # tool can't request broader scope
   }
   ```

3. **Frequency limits are respected**
   ```fpl
   credential stripe {
     ttl 15m  # credential is valid for 15 minutes
   }
   ```

4. **Audit requirements are met**
   - All credential requests are recorded with tool ID, requested scope, approval/denial
   - Durable audit trail in DPR store

### Cached Credentials

Once issued, credentials are cached until TTL expires:

```bash
# Tool requests at 10:00
stripe_key = credential("stripe")  # issued, cached

# Tool requests at 10:05 (within TTL)
stripe_key = credential("stripe")  # returned from cache, no backend hit

# Tool requests at 10:20 (past TTL)
stripe_key = credential("stripe")  # TTL expired, refetch from backend
```

## 7. Credential Access from Agent Code

### Python SDK

```python
from faramesh import credential

# Fetch credential with default scope
key = credential("stripe")

# Fetch credential with specific scope
key = credential("stripe", scope="refund")

# With admin token (for testing)
key = credential("stripe", admin_token="secret")
```

### Node SDK

```javascript
const { credential } = require("@faramesh/sdk");

// Fetch credential
const key = await credential("stripe");

// With specific scope
const key = await credential("stripe", { scope: "refund" });
```

### REST API

```bash
curl -X POST http://localhost:9000/api/v1/credential/stripe \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"scope": "refund"}'
```

## 8. Troubleshooting

### Credential Not Available

**Error**: `credential_broker_unavailable`

**Check**:
```bash
faramesh credential status
faramesh credential vault status  # if using Vault
```

**Common Causes**:
- Daemon not started with credential broker
- Backend unreachable (network, auth)
- Policy denies access to this tool/principal

### Scope Mismatch

**Error**: `credential_scope_exceeded`

**Check policy**:
```bash
faramesh policy validate policy.fpl --json
```

**Fix**: Ensure `max_scope` ceiling matches tool's actual needs.

### TTL Expired

**Symptom**: Credentials work initially, then fail

**Root Cause**: TTL elapsed without refresh

**Fix**: Increase TTL or make tool request credential more frequently

### Audit Trail Missing

**Check**:
```bash
faramesh audit tail  # filter for credential requests

faramesh audit show <action-id>
```

## 9. Production Checklist

- [ ] Backend (Vault/AWS/GCP/Azure) is configured and accessible
- [ ] Faramesh daemon runs with `--broker` or credential backend flags
- [ ] Policy declares credential blocks with appropriate scopes
- [ ] TTLs are tuned for your backend rate limits
- [ ] Agent code uses SDK `credential()` function
- [ ] Audit trail is logged and monitored
- [ ] Credentials are never in environment variables
- [ ] Failover backend is configured (optional)

## See Also

- [Identity and SPIFFE](/identity/spiffe-workload-identity/)
- [Production Setup](/getting-started/production-setup/)
- [FPL Language: Credential Blocks](/policies/fpl-language/#10-credential-block-brokered-secrets)
- [Faramesh Core Credential Docs](https://github.com/faramesh/faramesh-core/tree/main/internal/core/credential)
