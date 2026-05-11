---
title: Role-Based Access Control
description: Granting and restricting agent capabilities with fine-grained RBAC.
---

Faramesh does not model RBAC as a separate admin-only permission system. Instead, it applies role-like access control through policy evaluation on agent identity and action context.

The policy schema includes `agent_id` in multiple control surfaces:

- `SessionStatePolicy.agent_id` for shared session-state access rules.
- `LoopGovernance.agent_id` for iteration and cost limits on a specific agent.
- `OrchestratorManifest.agent_id` and `AgentInvocation.agent_id` for declaring which sub-agents may be invoked.
- `DelegationPolicy.target_agent` for constrained delegated invocation.

## How to use it

Use identity-scoped policies when a class of agents shares a baseline but still needs different limits or tool access. For example, a production payments agent should not share the same write surface as a research or evaluation agent.

## Practical patterns

- Scope the policy by `agent_id` so the engine can distinguish one runtime identity from another.
- Add explicit tool patterns, thresholds, or phase rules for sensitive actions.
- Use delegation and orchestrator policies to bound child-agent behavior instead of relying on ad hoc naming conventions.
- Pair the policy with agent identity verification when you need stronger trust guarantees.

## Related fields in the engine

- `delegation.agent_identity_verified`
- `principal.verified`
- `principal.org`

## See also

- [Agent Identities](/identity/agent-identities/)
- [Credential Sequestration](/identity/credential-sequestration/)
- [SPIFFE Workload Identity](/identity/spiffe-workload-identity/)
- [Your First Policy](/getting-started/your-first-policy/)
