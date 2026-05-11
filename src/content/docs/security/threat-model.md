---
title: Threat Model
description: What Faramesh protects against, and what it doesn't.
---

Faramesh is built to protect against unauthorized agent tool calls, prompt injection that would otherwise trigger destructive execution, credential exfiltration through the agent, and unaudited action histories.

It does not magically protect you if the Faramesh server itself is compromised, if the SDK is malicious, or if your network and identity layers are broken. Those are infra and platform concerns.

Trust boundaries are explicit:

- the agent is untrusted
- Faramesh is trusted to enforce policy
- the tools are trusted only after the boundary says they may run

Layer this with IAM, network controls, sandboxing, and secrets management rather than relying on a single defense.

See [Prompt Injection Defense](/security/prompt-injection-defense/) and [Zero Trust Execution](/concepts/zero-trust-execution/).
