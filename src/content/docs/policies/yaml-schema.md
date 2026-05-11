---
title: Policy YAML Schema
description: Complete reference for the Faramesh policy file format.
---

The checked-in Go schema in `internal/core/policy/schema.go` defines the YAML shape. At the top level, a policy may include `faramesh-version`, `agent-id`, `vars`, `tools`, `phases`, `rules`, `post_rules`, `budget`, `session`, `default_effect`, and a set of extension blocks.

```yaml
rules:
  - id: "rule-identifier"
    match:
      tool: "stripe/* | http/get | *"
      host: "*.example.com"
      method: "POST | GET | *"
      path: "/api/*"
      when: "args.amount > 100"
    effect: "permit | defer | deny | modify | step_up"
    reason: "human-readable reason"
    reason_code: "code-for-audit"
```

The actual Go fields that back the schema include:

- `Rule.ID`, `Rule.Match`, `Rule.Effect`, `Rule.Reason`, `Rule.ReasonCode`, `Rule.ApprovalsRequired`
- `Match.Tool`, `Match.Host`, `Match.Port`, `Match.Method`, `Match.Path`, `Match.Query`, `Match.Headers`, `Match.When`
- `Doc.DefaultEffect`, `Budget.DailyUSD`, `Budget.SessionUSD`, `Budget.MaxCalls`, `Budget.SessionTokens`, `Budget.DailyTokens`

The Go schema is richer than the minimal example above. It also supports phase transitions, session-state policy, cross-session guards, defer tiers, orchestrator manifests, delegation policies, tool schemas, chain policies, output policies, and execution isolation.

### Worked example

```yaml
faramesh-version: "1.0"
agent-id: "payment-agent"
default_effect: deny

tools:
  stripe/refund:
    tags:
      - "risk:high"

rules:
  - id: deny-shell
    match:
      tool: "shell/*"
      when: "true"
    effect: deny
    reason: "payment agents must not use shell"

  - id: permit-customer-read
    match:
      tool: "read_customer"
      when: "true"
    effect: permit

  - id: defer-high-value-refund
    match:
      tool: "stripe/refund"
      when: "args.amount != nil && args.amount > 100"
    effect: defer
    reason: "large refunds require approval"
```

See [Your First Policy](/getting-started/your-first-policy/) for a step-by-step version of the same shape.
