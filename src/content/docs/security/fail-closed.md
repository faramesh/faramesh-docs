---
title: Fail-Closed Behavior
description: How Faramesh behaves when policy is unavailable or a rule doesn't match.
---

The secure default in the checked-in policy engine is denial when no rule matches. The runtime and adapters also treat transport failures conservatively unless you have explicitly opted into a fail-open path for development or a constrained use case.

That is the only sane default for execution governance: if the boundary is down, nothing should quietly keep running.

:::caution
If you choose fail-open, treat it as an explicit exception and not the baseline. Production deployments should justify that decision in writing.
:::

See [The Action Authorization Boundary](/concepts/action-authorization-boundary/) and [Policy Engine](/concepts/policy-engine/).
