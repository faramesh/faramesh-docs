---
title: Credentials
description: How Faramesh's broker mints short-lived scoped credentials at the call site so the agent never holds long-lived secrets.
---

The single biggest data-exfiltration risk in an agent system is the long-lived credential — an API key in an env var, a service-account JSON in a config map, a Vault token cached in process memory. Faramesh removes that risk by **brokering credentials at the call site** and never letting the agent see one.

## The broker

When a rule `permit`s a call that needs a credential, the daemon calls the configured **credential provider** for a scoped, short-lived secret.

```text
Agent process                Daemon                       Provider
──────────────              ────────                      ────────
GovernedToolSet.invoke ───►  permit decision  ───────►   GetSecret(spec)
                              broker injects                  │
                              into call site                  │
       ◄──── tool runs ◄──── credential ◄────── short-lived token
```

The broker handles **token-acquisition**, **token-injection**, **scope-validation**, and **token-revocation** on a per-call basis. The agent process at no point holds a credential it could leak — it sees the tool result and a reference id, never the raw secret.

## Credential specs

A credential spec is derived from the rule and the tool's metadata:

| Field | Source | Example |
|-------|--------|---------|
| `provider` | Rule binding or default | `vault` |
| `path` | Tool registry profile | `kv/data/payments/stripe-token` |
| `scope` | Rule annotation | `read,write` |
| `ttl` | Provider default or rule | `30s` |
| `principal` | Agent identity | `spiffe://corp.faramesh.dev/agents/payments-bot` |

For example, a Stripe tool registers itself with the framework profile `stripe@1.3.0`. The profile declares the credential spec; the daemon resolves it at call time:

```fpl
import "registry.faramesh.dev/policies/stripe@1.3.0" as stripe_rules
provider "vault" { type = "vault"; addr = env("VAULT_ADDR"); ... }
```

When `stripe/charge` permits, the daemon calls Vault for the scoped path, gets a 30-second token, hands it to the SDK shim, the shim attaches the token to the Stripe call, and the token expires before it can be exfiltrated.

## What "scoped" means

Every credential the broker mints is scoped to:

1. **One action.** A `stripe/charge` token cannot be reused for `stripe/refund`.
2. **One agent identity.** A token issued for `payments-bot` cannot be used by `support-bot`.
3. **A short window.** Default 30 seconds. Provider-configurable down to the wire latency.

The provider returns the **smallest credential that works**. For Vault, that's typically a child token with a one-shot policy. For AWS STS, an assume-role session with a request-scoped condition. For SPIFFE, an SVID with a path-restricted audience.

## Built-in credential providers

| Provider | Real credential type | Where it lives |
|----------|---------------------|----------------|
| `vault` | Short-lived child token | HashiCorp Vault |
| `aws-sm` | Direct secret lookup with STS-bound principal | AWS Secrets Manager |
| `gcp-sm` | Versioned secret with IAM context | Google Secret Manager |
| `azure-kv` | Secret bundle from Key Vault | Azure Key Vault |
| `spiffe` | SVID + bound JWT for audience | SPIRE workload API |

See [Providers](/providers/) for the schema of each.

## What the agent sees

```python
result = tool.invoke({"amount": 240, "currency": "USD"})
```

That's it. The shim opens a per-call channel to the daemon, the daemon brokers the credential, and the tool runs. The agent process never imports the secret, never sees the token in memory, never logs it.

If a tool's implementation insists on receiving a credential as a string (legacy SDKs), the shim **injects a sentinel** that the framework's HTTP client recognizes; the actual token never crosses the framework's abstraction.

## What the audit chain records

Each DPR carries a `credential_ref` block (see [Auditing](/concepts/auditing/)):

```json
{
  "credential_ref": {
    "provider": "vault",
    "path_hash": "sha256:...",
    "scope": "stripe:charge:write",
    "issued_at": "2026-05-17T13:42:18Z",
    "ttl_seconds": 30,
    "issuance_id": "vault-lease-01HXY..."
  }
}
```

The credential value is **never** in the chain. The `issuance_id` lets you correlate with the provider's own audit log for compliance evidence.

## Credential rotation

When the upstream rotates a secret, the broker picks up the new value on the next call automatically — providers cache per-path with a short TTL and a `provider.RotateNotify` hook for explicit invalidation. There is no agent restart, no `apply`, no cache flush.

`faramesh credential probe <provider>` verifies the broker can still mint a fresh credential without making a real tool call.

## Stripped ambient credentials

By default, the daemon **strips ambient credentials** from the agent environment before the agent process is launched:

```fpl
runtime {
  strip_env = ["AWS_*", "GCP_*", "VAULT_*", "DATABASE_URL"]
}
```

This prevents a tool from "falling back" to an env var when the broker doesn't deliver. The only path to a credential is the broker.

Bypassing this requires a configuration change, which produces its own DPR and audit-sink record.

## Where this fails open (and how to close it)

| Risk | Mitigation |
|------|------------|
| A provider returns a long-lived token by misconfiguration. | Use the recommended scoped-role configurations in [Providers](/providers/). Add `provider.scope_required = true` to fail closed if a returned token's expiry exceeds the configured ceiling. |
| A tool persists the credential to disk before using it. | Combine with Linux OS-tier enforcement; `landlock` rules prevent the tool from writing to non-stack paths. |
| The agent process is compromised and reads the credential from the shim's injection point. | Move to the MCP / HTTP proxy tier so the credential never enters the agent process at all — it's attached at the proxy boundary. |

For high-risk credentials (payment, infra), the recommended posture is **proxy-tier interception** plus **provider-scoped tokens** so the agent never gets to be a vulnerability surface.

## What's next

- [Providers](/providers/) — every provider's schema
- [Enforcement](/concepts/enforcement/) — where the broker call sits in the pipeline
- [Security model](/security/) — what credentials protect against and what's still your responsibility
