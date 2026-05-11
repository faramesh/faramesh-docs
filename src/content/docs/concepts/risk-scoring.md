---
title: Risk Scoring
description: How Faramesh models risk context alongside policy rules.
---

The checked-in source shows two complementary risk surfaces. In the Go CLI, `faramesh policy simulate` accepts `--risk-score` and injects `risk_score` into the simulated action args. In the SDK policy helpers, `RiskLevel` is an explicit enum with `low`, `medium`, and `high` values.

That means risk is part of the decision context, not a vague afterthought. The policy layer can allow an action while the surrounding runtime still escalates it into approval flow based on risk evidence.

```python
from faramesh import RiskLevel, PolicyRule, MatchCondition
```

```typescript
export type RiskLevel = "low" | "medium" | "high";
```

In practice, risk in this codebase is driven by things the runtime already knows: tool class, operation, parameter shape, amount thresholds, agent identity, and sequence context.

See [Risk Levels](/policies/risk-levels/) and [Policy Simulation](/reference/cli/) for the commands that expose the risk path.
