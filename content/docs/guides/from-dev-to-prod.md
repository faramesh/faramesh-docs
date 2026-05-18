---
title: Tutorial. From dev to production
description: Move a Faramesh stack from in-process stubs to real Vault, SPIFFE, and KMS providers without changing a single rule.
---

You wrote a policy. You ran it locally with `faramesh dev`. Now you want it in production.

The good news: **you don't change rules.** The agent code stays the same. The `governance.fms` stays the same. Except for the `provider` and `identity` declarations, which swap from in-process stubs to real backends.

This tutorial walks through the swap.

## The two-line difference

In dev:

```bash title="Terminal"
faramesh dev
```

This runs the daemon with **in-process stubs** for credentials, identity, KMS, audit sink, and cost. No external services. The WAL is in-memory.

In production:

```bash title="Terminal"
faramesh apply
```

The same compiled `governance.fms` runs, but the providers it declares are real subprocesses talking to real backends. The WAL is on disk. Optional OS-tier sandbox kicks in if you've enabled it.

The transition between the two is configuration in `governance.fms`, not code in the agent.

## What needs to be real for production

| Concern | Dev (stub) | Production (real) |
|---------|------------|-------------------|
| Secrets | Random `STUB-<id>` tokens | Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault |
| Identity | Synthesized SPIFFE id under `spiffe://dev.local/` | SPIRE, OIDC IDP, your platform's workload identity |
| KMS / signing | Ephemeral RSA keypair generated per session | AWS KMS, GCP KMS, Vault Transit, Azure Key Vault |
| Audit sink | Pretty-printed JSON to stderr | Splunk, Datadog, S3, your SIEM |
| Cost | Built-in pricing table | (Optional) external cost provider |
| WAL | In-memory | SQLite (default) or Postgres |
| OS sandbox | Off | `runtime { os_tier = true }` |
| Config integrity | Off | `runtime { immutable_config = true }` |

You can switch them one at a time.

## Step 1: persist the WAL

```hcl title="governance.fms"
runtime {
  mode    = "enforce"
  backend = "sqlite"               # or "postgres"
  wal_dir = "/var/lib/faramesh/wal"
}
```

The WAL is where Decision Provenance Records live. In production this should be on persistent storage, ideally with backup. For high write rates use `backend = "postgres"` and configure `runtime { postgres_url = … }`.

## Step 2: real secrets

Replace the credential stub with a real provider:

```hcl title="governance.fms"
provider "vault" {
  type      = "vault"
  addr      = env("VAULT_ADDR")
  token     = env("VAULT_TOKEN")
  mount     = "kv/data/payments"
  namespace = "platform"
}
```

Or AWS:

```hcl title="governance.fms"
provider "aws-secrets" {
  type   = "aws-secrets-manager"
  region = "us-west-2"
}
```

Now when the daemon brokers a credential at step 9 of the [pipeline](/concepts/enforcement/), it calls Vault (or AWS) with the agent identity and gets a real, scoped, short-lived secret.

→ Every provider is documented in [Providers](/providers/).

## Step 3: real workload identity

Stop trusting the agent's self-declared `agent_id`. Have SPIRE attest to it:

```hcl title="governance.fms"
identity "prod" {
  type         = "spiffe"
  socket       = "/run/spire/agent.sock"
  trust_domain = "corp.example.com"
}
```

The SPIRE workload API will give the daemon a verified SVID for each agent process. Mismatches fail closed.

If you don't have SPIRE, use an OIDC IDP (Okta, Auth0, Google). Faramesh accepts ID tokens at attestation time:

```hcl title="governance.fms"
identity "prod" {
  type        = "oidc"
  issuer      = "https://accounts.example.com"
  client_id   = env("OIDC_CLIENT_ID")
  audience    = "faramesh-agents"
}
```

## Step 4: external KMS for DPR signing

Local-keypair signing is fine in dev. For production audit, use an external KMS so a host compromise doesn't let an attacker forge plausible audit history:

```hcl title="governance.fms"
provider "audit-kms" {
  type    = "kms"
  backend = "aws-kms"               # aws-kms | gcp-kms | vault-transit | azure-kv
  key_arn = "arn:aws:kms:us-west-2:123:key/..."
}
```

Now every DPR is signed by KMS. `faramesh audit verify` will check those signatures offline against the public key fingerprints stored in the WAL.

→ Detail: [KMS & signing](/concepts/kms/).

## Step 5: ship audit records to your SIEM

Stub mode pretty-prints DPRs to stderr. In production, ship them to your audit sink:

```hcl title="governance.fms"
provider "splunk" {
  type  = "splunk-sink"
  url   = env("SPLUNK_URL")
  token = env("SPLUNK_HEC_TOKEN")
  index = "faramesh-decisions"
}
```

Or Datadog, S3, or a generic webhook. See [Providers](/providers/).

## Step 6: enable the OS sandbox (Linux/macOS)

For agents you don't fully trust (third-party code, MCP servers from the internet, jailbreak-prone setups), turn on the OS-tier sandbox:

```hcl title="governance.fms"
runtime {
  os_tier                   = true
  strip_ambient_credentials = true
  agent_enforce_profile     = "full"
}
```

After `faramesh apply`, start your agent through the generated launcher:

```bash title="Terminal"
.faramesh/bin/agent -- python agent.py
```

Or, even better, let the daemon start and supervise the agent for you:

```hcl title="governance.fms"
runtime {
  os_tier                   = true
  supervised_command        = "python agent.py"
  strip_ambient_credentials = true
  agent_enforce_profile     = "full"
}
```

`faramesh apply` starts the daemon; the daemon's agent supervisor starts the agent with the sandbox applied; `faramesh apply --stop` stops both.

→ Detail: [Architecture: agent supervisor and OS-tier sandbox](/concepts/architecture/#3-the-agent-supervisor-and-os-tier-sandbox).

## Step 7: lock the config file

For hostile-tenant setups, lock `governance.fms` on disk after apply so a process on the host can't tamper with it between applies:

```hcl title="governance.fms"
runtime {
  immutable_config = true
}
```

On Linux, this sets `chattr +i`. On macOS, `chflags uchg`. To change policy, the operator running `faramesh apply` must have privileges to clear the flag.

## The full production stack

Putting it together:

```hcl title="governance.fms"
import "github.com/faramesh/faramesh-registry/frameworks/langgraph@1.0.0"
import "github.com/faramesh/faramesh-registry/policies/stripe@1.3.0" as stripe

runtime {
  mode                      = "enforce"
  backend                   = "postgres"
  postgres_url              = env("FARAMESH_PG_URL")
  wal_dir                   = "/var/lib/faramesh/wal"
  cold_start_deny_window    = "10s"
  os_tier                   = true
  strip_ambient_credentials = true
  agent_enforce_profile     = "full"
  immutable_config          = true
}

provider "vault" {
  type      = "vault"
  addr      = env("VAULT_ADDR")
  token     = env("VAULT_TOKEN")
  mount     = "kv/data/payments"
  namespace = "platform"
}

provider "audit-kms" {
  type    = "kms"
  backend = "aws-kms"
  key_arn = env("FARAMESH_KMS_KEY_ARN")
}

provider "splunk" {
  type  = "splunk-sink"
  url   = env("SPLUNK_URL")
  token = env("SPLUNK_HEC_TOKEN")
  index = "faramesh-decisions"
}

identity "prod" {
  type         = "spiffe"
  socket       = "/run/spire/agent.sock"
  trust_domain = "corp.example.com"
}

trust {
  key "github.com/faramesh/faramesh-registry" ed25519:nxNjaQnS3L+zzKrRq48XfYBDWlFXkNJkxUiTD8j0sFs=
}

agent "support-bot" {
  default deny

  rules {
    permit knowledgebase/search
    permit ticket/read
    permit refund if amount < $25
    defer  refund if amount < $500
    deny   refund
  }

  rate_limit "refund": 5 per minute
  budget daily { max $1000 on_exceed defer }
  redact refund args: ["card.number", "card.cvv"]
  egress { allow = ["api.example.com"] }
  alert  { on = "deny" notify = "slack://#sec-alerts" }
}
```

The agent's `rules`, `rate_limit`, `budget`, `redact`, `egress`, and `alert` blocks are **identical** to what you wrote in dev. Only the runtime/provider/identity blocks changed.

## Verifying

After `faramesh apply`:

```bash title="Terminal"
faramesh status                  # daemon health, providers, WAL backend
faramesh audit verify            # hash chain + KMS signatures
faramesh plan                    # would the new policy change anything vs. last 24h?
```

Run a smoke test through the agent. Confirm:

- A permit returns the expected result.
- A defer creates an approvable record.
- A deny raises with the right `reason`.
- DPRs are arriving in your SIEM.
- `faramesh status` shows the daemon as `READY` and providers as healthy.

## Where to go next

- [Deploying at scale](/guides/platform-engineer/): fleet operations, catalog mirroring, CI gates.
- [Architecture](/concepts/architecture/): full process layout including the supervisor.
- [Security model](/security/): threats, guarantees, and explicit limits.
- [Auditing](/guides/security-engineer/): what evidence to collect and how to map it to controls.
