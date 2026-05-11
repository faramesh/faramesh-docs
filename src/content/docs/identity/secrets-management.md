---
title: Secrets Management
description: Registering and managing credentials in Faramesh's secrets store.
---

The checked-in runtime exposes secrets backends through `faramesh serve` and onboarding flows. The command surface includes Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, 1Password, and Infisical-related environment hooks in the onboarding path.

In production, keep secrets in the broker, not in the prompt or the agent process. Use the agent identity and policy context to decide which tool call may receive which secret at execution time.

For local development, environment fallback exists, but the server flags it as a development escape hatch rather than a production pattern.

See [Credential Sequestration](/identity/credential-sequestration/) and [Configuration Reference](/deployment/configuration/).
