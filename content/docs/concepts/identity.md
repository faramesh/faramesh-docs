---
title: Identity
description: SPIFFE, SVIDs, IDPs, and the agent identity that scopes every credential and rule in Faramesh.
---

Every decision Faramesh makes is bound to an **agent identity**. Identity is not a string the agent sends, it's an attested, cryptographically verifiable claim issued by an identity provider before the daemon will evaluate any rule for that agent.

Without a real identity, every per-agent budget, rate limit, and rule is forgeable. With one, the daemon enforces them as hard guarantees.

## The identity model

```text title="Output"
┌────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  Agent process │────►│ Identity provider    │     │  Faramesh daemon │
│                │     │ (SPIRE / IDP / OIDC) │     │                  │
│   (untrusted)  │     │                      │     │                  │
└──────┬─────────┘     └──────────┬───────────┘     └────────┬─────────┘
       │                          │                           │
       │ requests SVID            │  signs SVID               │
       └─────────────────────────►│                           │
                                  └────  daemon verifies ────►│
                                                              │
                                                  bound to    ▼
                                              every decision DPR
```

The agent process is treated as untrusted. The identity provider. SPIRE, an OIDC IDP, or a workload-attesting service, is the trusted authority that says "this process running on this machine, owned by this account, is `payments-bot`."

The daemon never takes the agent's word for who it is. It always verifies.

## SPIFFE and SVIDs

The recommended identity model is **SPIFFE**, an open spec for workload identity, backed by **SPIRE**, the reference SPIFFE server / agent.

A **SVID** (SPIFFE Verifiable Identity Document) is the credential SPIRE issues to a workload. It looks like:

```text title="Output"
spiffe://corp.faramesh.dev/agents/payments-bot
```

The SPIRE agent attests the workload (process selectors, Unix uid, container labels, K8s service account, etc.) and issues a signed X.509 or JWT SVID. The daemon presents the SVID at every decision and verifies it against the SPIRE trust bundle.

**Configure** in `governance.fms`:

```hcl title="governance.fms"
identity "spire-default" {
  type         = "spiffe"
  socket       = "/run/spire/agent.sock"
  trust_domain = "corp.faramesh.dev"
}
```

The daemon talks to the local SPIRE agent over the workload API socket. SVID rotation propagates automatically, the next decision uses the freshest SVID without restart.

Once SPIFFE is configured, every DPR records the agent's SVID:

```json title="response.json"
{
  "agent_id": "payments-bot",
  "agent_svid": "spiffe://corp.faramesh.dev/agents/payments-bot",
  "agent_svid_expiry": "2026-05-17T14:30:00Z",
  ...
}
```

## OIDC / IDP attestation

For agents running in environments without SPIRE, Faramesh can attest identity via an OIDC IDP (Okta, Auth0, Azure AD, Google Workspace, custom) using the JWT bound to the workload at startup.

```hcl title="governance.fms"
identity "okta-prod" {
  type           = "oidc"
  issuer         = "https://corp.okta.com"
  audience       = "faramesh"
  jwks_url       = "https://corp.okta.com/.well-known/jwks.json"
  claim_agent_id = "sub"
  claim_groups   = "groups"
}
```

The daemon fetches the JWT from a process-bound location (env var, file, or workload API), verifies the signature against the JWKS, and uses the claims to identify the agent. The JWT's `exp` becomes the SVID expiry.

## Cloud workload identity

The major clouds expose workload identity natively. Faramesh adapters wrap them:

| Cloud | Identity surface | Adapter |
|-------|------------------|---------|
| AWS | IAM role + STS token (instance, ECS, EKS, Lambda) | `type = "aws-workload"` |
| GCP | Service account + workload identity federation | `type = "gcp-workload"` |
| Azure | Managed identity | `type = "azure-workload"` |
| Kubernetes | Service account token (projected) | `type = "k8s-projected"` |

Each adapter is a tiny shim that converts the platform's native attestation into a SPIFFE-style identity the rest of the daemon understands.

## Why identity matters in policy

Identity scopes everything per-agent:

- **Budgets** are tracked per agent identity. A different identity can't spend another's quota.
- **Rate limits** are bucketed per identity per pattern.
- **Rules** can match on identity claims:

  ```hcl title="governance.fms"
  rules {
    permit ehr/records/read   if principal.role == "claims_examiner"
    permit ehr/records/write  if principal.role == "claims_examiner" and principal.mfa == true
  }
  ```

- **Delegation** chains record every identity the call passed through.
- **Multi-tenant isolation** uses identity claims as the trip wire:

  ```hcl title="governance.fms"
  rules {
    permit crm/customers/read   if customer.tenant == principal.tenant
    deny   crm/customers/read   if customer.tenant != principal.tenant
  }
  ```

`principal.*` is the structured identity claim set. `principal.tenant`, `principal.role`, `principal.email`, `principal.groups`, `principal.mfa`, etc., all populated from the SVID or JWT, all trusted because the daemon verified the signature.

## What an identity is **not**

| Not | Because |
|-----|---------|
| The `agent_id` string in the SDK | That's a label. The daemon resolves it through the configured identity provider. |
| The hostname | A compromised process can spoof it. |
| An API key | If you have it, you are it. Faramesh wants attestation. |
| The OS user | A useful selector for SPIRE attestation, not an identity by itself. |

If you find yourself thinking "the agent will tell us who it is", that's the part identity replaces.

## Identity in the no-infrastructure mode

[Run locally](/cli/dev/) (`faramesh dev`) substitutes a built-in identity provider that synthesizes a deterministic SPIFFE id from the host:

```text title="Output"
spiffe://localhost/dev/<hostname>/<stack-name>/<agent-id>
```

Every DPR emitted in this mode is tagged so it cannot be confused with a production audit chain. When you switch to `faramesh apply`, the daemon refuses to launch in `enforce` mode without a real identity provider declared.

## Multi-agent processes

When one process hosts more than one logical agent (a supervisor and its workers, an event router that adopts a different identity per task type, a sidecar that proxies several agents), each agent must attest a distinct identity. The daemon refuses to evaluate calls that arrive on the same process under a different agent id without a fresh attestation.

In practice this means:

- The SDK shim is constructed once per agent, with the matching `agentId`.
- SPIRE selectors should distinguish the agents (different process labels, thread ids, or namespace hints) so SPIRE issues a distinct SVID for each.
- When that's not possible (one process, one Unix uid, no labels), use a **process-bound JWT** issued at agent boot, the daemon treats the JWT as the SVID for that agent's lifetime.

## Sub-agents and delegation

Supervisor / worker patterns are first-class. The supervisor is a declared agent. Each worker class it can spawn is also a declared agent. When a supervisor spawns a worker, the daemon:

1. Verifies the worker's identity attestation independently, a fresh SVID issued for the worker process.
2. Records a **delegation chain** in the worker's DPRs (`delegated_from = [supervisor.svid...]`).
3. Applies the worker's own rules and budget, scoped by the supervisor's `delegate { ... }` block.

```hcl title="governance.fms"
agent "supervisor" {
  spawn   { allow = ["worker-research", "worker-writer"] }
  delegate {
    to       = ["worker-research", "worker-writer"]
    inherits = ["budget.daily"]                       # workers spend the supervisor's budget
  }
}

agent "worker-research" {
  rules {
    permit web/fetch
    deny   filesystem/write
  }
}
```

The audit chain shows the full identity path that produced an action, every supervisor and worker the request crossed, every SVID it carried, every trust domain it traversed. See [Topologies → situation 3](/concepts/topologies/#situation-3--one-agent-that-spawns-sub-agents-dynamically).

## Identity across deployment shapes

| Shape | Identity attestation |
|-------|----------------------|
| Single laptop, one agent | Local SPIRE agent or a developer-issued OIDC token. |
| One machine, many agents | One SPIRE agent issuing distinct SVIDs per process selector. |
| Sub-agents spawned at runtime | Each spawned process attests independently; SPIRE selectors include the parent + spawn metadata. |
| Horizontal scale | All replicas share the same SPIFFE id (same agent identity), differentiated by instance metadata in the DPR. |
| Multi-environment | Each environment has its own trust domain (`dev.corp.faramesh.dev`, `prod.corp.faramesh.dev`). |
| Multi-team | Same trust domain, distinct SPIFFE paths (`/teams/payments/agents/...` vs `/teams/logistics/...`). |
| Kubernetes | Projected service account token + SPIRE attestation via the K8s workload-attestor plugin. |
| Serverless | Cloud-native workload identity (AWS IAM role, GCP service account, Azure managed identity) wrapped by a Faramesh adapter. |
| Engineering team (Claude Code) | OIDC JWT minted at session start by the corporate IDP, mapped to a per-engineer SPIFFE id. |
| Multi-cloud, multi-region | Per-region SPIRE servers federated under one trust domain, or cloud-native identity per region. |

See [Topologies](/concepts/topologies/) for the full set of deployment shapes and what each one means for identity attestation.

## Trust domains

The SPIFFE **trust domain** is the boundary across which identities are mutually trusted. One trust domain per organization is the default. For federated setups (multi-org agent collaboration), Faramesh supports SPIFFE federation: declare federated trust roots and the daemon will accept SVIDs from peer trust domains for cross-org A2A delegation.

```hcl title="governance.fms"
trust {
  spiffe_federated "spiffe://partner.example.com" \
    bundle_url = "https://partner.example.com/spire/bundle"
}
```

Federation is opt-in per peer. A2A delegation that crosses a trust domain is recorded as such in the DPR so audit pipelines can isolate cross-org actions.

## Identity in the audit chain

Every DPR carries:

- `agent_id`, the human-readable label
- `agent_svid`, the full SPIFFE URI or JWT subject
- `agent_svid_expiry`, when the credential was due to rotate
- `principal_claims_hash`. SHA-256 of the structured claim set

Identity claims themselves are **not** in the DPR because they may contain PII. The hash is enough to reproduce the decision; the audit sink stream carries the full claim set under the retention and access controls you have configured.

## What's next

- [Topologies](/concepts/topologies/): every deployment shape and what it means for identity
- [Providers → SPIFFE](/providers/#spiffe--spire): full SPIRE adapter configuration
- [Credentials](/concepts/credentials/): how identity scopes the credential broker
- [Auditing](/concepts/auditing/): how identity ties into the DPR chain
- [Security model](/security/): what identity protects against
