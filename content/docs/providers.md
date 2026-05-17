---
title: Providers
description: Vault, AWS, GCP, Azure, SPIFFE, KMS, and audit sinks, every provider Faramesh ships with.
---

A **provider** is a process the daemon talks to over gRPC to do something the policy can't do alone, fetch a secret, attest workload identity, sign a decision, ship audit records, or look up cost.

Providers are declared in `governance.fms`:

```hcl title="governance.fms"
provider "<local-name>" {
  type = "<provider-type>"
  ...provider-specific fields
}
```

Faramesh resolves the binary, verifies its signature against your trust roots, launches it as a subprocess, and connects over a per-stack Unix socket. The daemon never trusts anything the agent says about secrets, providers are the only path to short-lived credentials at the call site.

## Credential providers

### Vault

```hcl title="governance.fms"
provider "vault" {
  type      = "vault"
  addr      = env("VAULT_ADDR")
  token     = env("VAULT_TOKEN")
  mount     = "kv/data/payments"
  namespace = "platform"      # optional, Vault Enterprise
  role      = "faramesh"      # optional, AppRole
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `addr` | yes | Vault server URL. |
| `token` | one of `token` / `role` | Static token. Use `env("...")` in production. |
| `role` | one of `token` / `role` | AppRole id; `secret_id` must be supplied via env. |
| `mount` | yes | KV mount and path. |
| `namespace` | no | Vault Enterprise namespace. |

### AWS Secrets Manager

```hcl title="governance.fms"
provider "aws-sm" {
  type     = "aws-sm"
  region   = "us-east-1"
  role_arn = "arn:aws:iam::123456789012:role/faramesh"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `region` | yes | AWS region. |
| `role_arn` | no | Role to assume via STS. Defaults to the EC2/EKS/Lambda execution role. |

### GCP Secret Manager

```hcl title="governance.fms"
provider "gcp-sm" {
  type    = "gcp-sm"
  project = "faramesh-prod"
}
```

### Azure Key Vault

```hcl title="governance.fms"
provider "azure-kv" {
  type           = "azure-kv"
  vault_url      = "https://faramesh.vault.azure.net"
  tenant_id      = env("AZURE_TENANT_ID")
  client_id      = env("AZURE_CLIENT_ID")
  client_secret  = env("AZURE_CLIENT_SECRET")
}
```

## Identity provider

### SPIFFE / SPIRE

```hcl title="governance.fms"
identity "spire-default" {
  type         = "spiffe"
  socket       = "/run/spire/agent.sock"
  trust_domain = "corp.faramesh.dev"
}
```

The daemon fetches an SVID for the agent identity at every evaluation. SPIRE rotations propagate immediately.

## KMS / signing provider

Used to sign Decision Provenance Records. In production, signing happens outside the daemon process so a daemon compromise cannot forge audit chains.

```hcl title="governance.fms"
provider "kms-aws" {
  type    = "aws-kms"
  region  = "us-east-1"
  key_arn = "arn:aws:kms:us-east-1:123456789012:key/abc-123"
}
```

```hcl title="governance.fms"
provider "kms-gcp" {
  type     = "gcp-kms"
  project  = "faramesh-prod"
  key      = "projects/.../locations/global/keyRings/.../cryptoKeys/faramesh-dpr/cryptoKeyVersions/1"
}
```

## Audit sinks

Audit sinks ship the decision stream off the host. The DPR chain in the local WAL is always authoritative; the sink is a copy for SIEM / data lake consumption.

```hcl title="governance.fms"
provider "audit-splunk" {
  type  = "splunk-sink"
  url   = env("SPLUNK_URL")
  token = env("SPLUNK_HEC_TOKEN")
  index = "faramesh-decisions"
}

provider "audit-datadog" {
  type    = "datadog-sink"
  api_key = env("DATADOG_API_KEY")
  site    = "datadoghq.com"
}

provider "audit-elastic" {
  type     = "elastic-sink"
  url      = env("ELASTIC_URL")
  api_key  = env("ELASTIC_API_KEY")
  index    = "faramesh-decisions"
}

provider "audit-s3" {
  type   = "s3-sink"
  region = "us-east-1"
  bucket = "faramesh-audit"
  prefix = "decisions/"
}

provider "audit-gcs" {
  type    = "gcs-sink"
  project = "faramesh-prod"
  bucket  = "faramesh-audit"
}
```

## Cost provider

Looks up token-level cost so budget rules can charge the right amount per call.

```hcl title="governance.fms"
provider "cost-default" {
  type = "cost-static"
  # uses bundled pricing table; updates ship with the registry pack
}

provider "cost-custom" {
  type = "cost-http"
  url  = "https://cost-api.internal/quote"
}
```

## Built-in stubs

When you run Faramesh without external infrastructure, missing providers fall back to safe in-process stubs:

| Type | Stub behavior |
|------|---------------|
| Credential | Returns a placeholder secret tagged `STUB`. |
| KMS | Signs with an ephemeral local key marked as non-production. |
| Identity | Synthesizes a deterministic SPIFFE id scoped to the host. |
| Audit sink | Writes to stdout in JSON Lines. |
| Cost | Uses bundled pricing. |

Stubs are explicit, every DPR is tagged so a production environment that accidentally falls back is obvious in the audit chain. See [Run locally](/dev/).

## Trust roots

Provider binaries are verified against the `trust` block in `governance.fms`:

```hcl title="governance.fms"
trust {
  key "github.com/faramesh/faramesh-registry" ed25519:MCowBQYDK2VwAyEA...
}
```

`faramesh apply` refuses to launch an unsigned or untrusted provider.

## Writing your own

Every provider is a small gRPC server speaking `proto/provider/v1/provider.proto`. Implement the service interface for the capabilities you care about and publish a signed binary to your registry.

The protocol covers:

- `GetSecret(spec)`, credential retrieval
- `Attest(workload)`, identity attestation
- `Sign(payload)`, decision signing
- `Emit(decision)`, audit sink
- `Quote(model, tokens)`, cost lookup
- `Init/Probe/Shutdown`, lifecycle

## What's next

- [Registry](/registry/): discover and pin signed providers
- [Stack reference](/stack/): where providers slot into `governance.fms`
- [Security model](/security/): what providers protect against
