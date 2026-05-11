---
title: What is Faramesh?
description: An execution control plane that sits between your AI agents and your infrastructure.
---

Faramesh is the deterministic governance layer described in the checked-in `faramesh-core` repository. The README is explicit: it sits between the agent and the tools it calls, blocks actions that violate policy, routes some actions to human approval, and writes tamper-evident evidence for audit and compliance.

The security problem is the Action Authorization Boundary. LLMs are stochastic; infrastructure is not. A system prompt is not a control plane. Faramesh makes every tool call cross one hard decision point before anything touches a real system.

:::note
This site is intentionally strict about terminology. Use Action Authorization Boundary, Proposed Action, Deterministic Canonicalization, Audit Ledger, and Human-in-the-Loop exactly as defined here.
:::

Faramesh is not an agent framework and it is not a second model watching the first. It is deterministic policy enforcement. The checked-in runtime supports local OSS use, managed Horizon flows, and Nexus enterprise deployment.

```text
Agent -> Faramesh API Server (Policy Engine) -> Tool Executor
```

Read the [Quickstart](/getting-started/quickstart/) next, then move to [Why Faramesh Exists](/concepts/why-faramesh/) for the threat model behind the design.
