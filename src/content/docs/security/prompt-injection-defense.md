---
title: Prompt Injection Defense
description: Why a hard execution gate is the only reliable defense against indirect prompt injection.
---

Prompt injection matters because agent outputs can be manipulated indirectly through tool results, web pages, emails, or any other text the model reads. If the model can be talked into calling the wrong tool, the damage happens at execution time.

Faramesh’s answer is to move the trust boundary out of the prompt and into deterministic enforcement. The agent can still be confused; the tool should still be blocked.

That is why the docs keep returning to the Action Authorization Boundary, deterministic canonicalization, and fail-closed behavior. They are the pieces that make the boundary real instead of aspirational.

See [Why Faramesh Exists](/concepts/why-faramesh/) and [Threat Model](/security/threat-model/).
