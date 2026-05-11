---
title: Zero Trust Execution
description: The agent never touches the target system directly.
---

Zero trust in Faramesh means the agent is never the trust anchor. It proposes actions; Faramesh governs them. The executor only sees an allowed action after the boundary has already made a decision.

Credentials stay out of the agent. The daemon and onboarding flow include credential broker backends and secret store configuration, but the agent itself does not need direct access to the underlying key material to make a proposal.

That separation matters because it reduces the blast radius of prompt injection, model compromise, and logging leaks. A malicious prompt can change what the model asks for, but it should not be able to acquire the key needed to execute the tool.

:::tip
The enforcement point is runtime, not prompt text. If an action does not have an approved decision from Faramesh, the tool should not run.
:::

See [Credential Sequestration](/identity/credential-sequestration/) and [Threat Model](/security/threat-model/) next.
