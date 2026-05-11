---
title: Why Faramesh Exists
description: The security gap between probabilistic agents and deterministic infrastructure.
---

The failure mode is simple: a model can be convinced to ask for the wrong tool call. One prompt injection or indirect prompt injection in tool output can flip an intended action into a destructive one. That is not a model-quality bug; it is the wrong trust boundary.

Prompt-based guardrails are bypassable. LLM-as-judge adds another stochastic system in the middle. Sandboxing helps contain execution, but it does not stop an agent from proposing an authorized-but-wrong action.

Faramesh’s thesis is that agents should not be trusted; they should be governed. Every action must cross a deterministic, policy-enforced boundary before it can touch real systems.

The README and runtime layout make this concrete: the engine sits between the agent and the executor, and the checked-in commands support policy validation, simulation, audit inspection, and approval workflows.

:::note
The docs reference a 2026 paper title used by the project narrative, but the local source of truth for behavior is still the checked-in code and policy examples in this workspace.
:::

Read [The Action Authorization Boundary](/concepts/action-authorization-boundary/) and [Prompt Injection Defense](/security/prompt-injection-defense/) next.
