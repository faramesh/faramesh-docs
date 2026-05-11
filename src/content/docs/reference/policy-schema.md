---
title: Policy Schema Reference
description: Annotated YAML reference for Faramesh policy files.
---

The top-level Go doc type is `Doc` in `internal/core/policy/schema.go`. That type includes the policy version, agent ID, tools, phases, rules, budgets, session behavior, guards, webhooks, and extension blocks.

For everyday authoring, the important rule fields are still the same ones you see in the examples:

- `id`
- `match`
- `effect`
- `reason`
- `reason_code`
- `approvals_required`

The policy helper types in the Python and Node SDKs add client-side constructors for the same ideas, including `RiskLevel` and `PolicyRule`.

See [Policy YAML Schema](/policies/yaml-schema/) for the annotated shape and [Your First Policy](/getting-started/your-first-policy/) for a working example.
