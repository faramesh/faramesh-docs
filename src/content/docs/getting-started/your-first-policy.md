---
title: Your First Policy
description: Write a real policy that governs shell and HTTP tools.
---

The policy surface in the Go schema is document-order driven: rules are evaluated top to bottom, and the first matching rule wins. The top-level fields in `internal/core/policy/schema.go` include `faramesh-version`, `agent-id`, `tools`, `phases`, `rules`, `default_effect`, and several extension blocks.

```yaml
faramesh-version: "1.0"
agent-id: "payment-agent"
default_effect: deny

rules:
  - id: deny-shell
    match:
      tool: "shell/*"
      when: "true"
    effect: deny
    reason: "payment agents must not use shell"

  - id: permit-http-get
    match:
      tool: "http/get"
      when: "true"
    effect: permit

  - id: defer-high-value-refund
    match:
      tool: "stripe/refund"
      when: "args.amount != nil && args.amount > 100"
    effect: defer
    reason: "large refunds require approval"
```

Rule ordering matters because the engine is first-match-wins. Put specific allow rules above broader deny rules, and keep a mandatory default-deny rule at the bottom.

:::caution
If you do not have an explicit allow or defer rule for a tool, the secure default is denial. Do not rely on accidental fallthrough.
:::

Load and hot-reload the policy with the CLI:

```bash
faramesh policy validate policies/payment.yaml
faramesh policy test policies/payment.yaml --tool stripe/refund --args '{"amount":500}'
faramesh policy reload --data-dir /var/lib/faramesh
```

The `policy test` and `policy simulate` commands are the fastest way to verify a rule before an agent ever calls it. For the full schema, see [Policy YAML Schema](/policies/yaml-schema/) and [Rules and Matching](/policies/rules-and-matching/).
