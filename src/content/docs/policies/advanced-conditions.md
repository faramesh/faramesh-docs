---
title: Advanced Conditions
description: Amount thresholds, time-based rules, compound conditions, and context-aware policy.
---

The policy schema and SDK policy helpers both support more than exact tool matching. The Go schema exposes `when` expressions with access to args, vars, session, tool, principal, delegation, and time. The Python helpers add convenience match conditions like amount thresholds, path predicates, regex patterns, and value equality.

That means you can write rules like:

```yaml
- id: defer-large-refund
  match:
    tool: "stripe/refund"
    when: "args.amount != nil && args.amount > 100"
  effect: defer

- id: permit-openai-egress
  match:
    tool: "proxy/http"
    host: "api.openai.com"
    method: "POST"
    path: "/v1/responses"
  effect: permit
```

The runtime also ships a policy simulation command that accepts an explicit `risk_score` signal so you can test context-aware rules without running a real agent.

See [Rules and Matching](/policies/rules-and-matching/) and [Risk Levels](/policies/risk-levels/).
