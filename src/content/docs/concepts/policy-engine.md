---
title: The Policy Engine
description: How Faramesh evaluates YAML policies.
---

The Go schema defines a `Rule` with an `id`, `match`, `effect`, and supporting metadata. Rules are evaluated in document order, and the first matching rule wins.

The `match` block supports exact tool IDs and wildcards, HTTP-aware fields like `host`, `method`, `path`, `query`, and `headers`, plus an expression field named `when` for context-aware checks.

```yaml
rules:
  - id: permit-http-get
    match:
      tool: "http/get"
      when: "true"
    effect: permit

  - id: deny-default
    match:
      tool: "*"
      when: "true"
    effect: deny
```

The CLI exposes three useful ways to exercise the engine without a running daemon:

```bash
faramesh policy validate policies/payment.yaml
faramesh policy test policies/payment.yaml --tool stripe/refund --args '{"amount":500}'
faramesh policy simulate policies/payment.yaml --tool stripe/refund --risk-score 0.95
```

The secure default is denial if no rule matches. Risk context can escalate a permitted decision into approval flow when the runtime or policy surface says the action is high risk.

Read [Rules and Matching](/policies/rules-and-matching/) and [Risk Levels](/policies/risk-levels/) next.
