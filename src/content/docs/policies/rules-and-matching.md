---
title: Rules and Matching
description: How Faramesh matches incoming actions against policy rules.
---

Rules are evaluated top to bottom. A match can be exact or wildcard-based, and the first matching rule wins.

The schema supports matching by `tool`, `host`, `port`, `method`, `path`, `query`, `headers`, and a `when` expression. The SDK policy helpers also support richer client-side match conditions such as `pattern`, `contains`, `amount_gt`, `amount_lte`, and `agent_id`.

Examples:

```yaml
- id: allow-http-get
  match:
    tool: "http/get"
    when: "true"
  effect: permit

- id: block-all-shell
  match:
    tool: "shell/*"
    when: "true"
  effect: deny

- id: require-approval-for-refunds
  match:
    tool: "stripe/refund"
    when: "args.amount > 100"
  effect: defer
```

Common gotcha: do not place a wildcard deny before the specific allow rules that should win first. The engine does not sort for you; it obeys document order.

For a richer matching model, compare the YAML schema page with the typed SDK helpers in [SDK Client Reference](/reference/sdk-client/).
