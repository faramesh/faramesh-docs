---
title: Architecture Internals
description: Internal control-flow, policy evaluation, session governance, and storage boundaries inside Faramesh.
---

# Architecture Internals

This page goes one level deeper than the high-level architecture overview. It focuses on the actual control surfaces that decide how an action moves through Faramesh: policy compilation, evaluation, session-state governance, and evidence storage.

## Runtime boundary

Faramesh sits between an agent and the actions it wants to execute. The core loop is:

1. A client proposes an action.
2. Faramesh canonicalizes and hashes the request.
3. The policy engine evaluates the request.
4. The runtime returns `allow`, `deny`, or `defer`.
5. Accepted actions execute through the permitted adapter or executor path.
6. Decision evidence is appended to the audit trail.

The top-level docs express this as:

```text
Agent -> Faramesh API Server + Policy Engine -> Executors / Tools
              |                        |
              v                        v
        Storage / DB              Web UI / CLI
```

## Policy engine internals

The policy engine compiles expressions when a policy file loads, then evaluates them against the request context.

Key properties from the engine implementation:

- Expressions are compiled once at load time.
- Rule evaluation is first-match-wins.
- If no rule matches, the policy default effect is applied.
- The runtime context exposes arguments, session history, tool metadata, principal identity, delegation, and time.

Relevant context fields include:

- `principal.id`, `principal.role`, `principal.org`, `principal.verified`
- `delegation.depth`, `delegation.origin_agent`, `delegation.origin_org`, `delegation.agent_identity_verified`
- `session.call_count`, `session.history`, `session.cost_usd`, `session.daily_cost_usd`
- `tool.reversibility`, `tool.blast_radius`, `tool.tags`

## Session-state governance

Shared state writes are not free-form. The session governor enforces a namespace per agent and blocks suspicious payloads before mutation.

The `Governor` implementation does three important things:

- Registers an `agent_id/` namespace for each agent.
- Rejects writes outside that namespace.
- Rejects suspicious write payloads that look like injection or embedded secrets.

That means session state is part of the governance boundary, not a side channel.

## Storage and evidence

The runtime stores evidence so decisions can be reconstructed later. The docs and code consistently describe a data directory, WAL-backed audit state, and optional mirrored storage.

What matters operationally is that stored records remain tied to the canonical request hash and the decision trail. That is what makes the ledger tamper-evident instead of just searchable.

## Control surfaces

The architecture is exposed through a few main surfaces:

- SDK/socket governance for direct agent integrations.
- HTTP proxy and MCP gateway for external tool surfaces.
- CLI and dashboard flows for policy, audit, approval, and identity operations.

## Source anchors

- `faramesh-core/README.md`
- `faramesh-core/internal/core/policy/engine.go`
- `faramesh-core/internal/core/session/governor.go`
- `faramesh-core/docs/README.md`
- `faramesh-core/docs/simple/07_PRODUCTION_SETUP.md`

## See also

- [Architecture Overview](/architecture/overview/)
- [Request Lifecycle](/architecture/request-lifecycle/)
- [Policy Evaluation Internals](/architecture/policy-evaluation/)
- [Storage Model](/architecture/storage-model/)
