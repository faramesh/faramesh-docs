---
title: Risk Levels
description: How to configure and use Faramesh's risk classification system.
---

The checked-in SDK policy helpers define three risk levels: `low`, `medium`, and `high`. The Node SDK exports the same union type, and the CLI can inject a numeric `risk_score` into a simulated action to exercise the decision path.

Use `low` for read-only or low-blast-radius actions, `medium` for actions that need context but are not destructive, and `high` for writes, deletions, financial movement, or anything that should naturally fall into approval flow.

```python
from faramesh import RiskLevel
```

```typescript
export type RiskLevel = "low" | "medium" | "high";
```

The important operational point is that risk context can lift a nominal allow into an approval path. That keeps policy explicit while still allowing the runtime to respond to dangerous context.

See [Risk Scoring](/concepts/risk-scoring/) and [Policy Simulation](/reference/cli/).
