---
title: Policies Overview
description: Policies are YAML files that define what agents are allowed to do.
---

Policies are the primary control surface in Faramesh. The checked-in Go schema loads YAML files, compiles `when` expressions, and evaluates rules in order. A policy can also declare tools, phases, budgets, and extension blocks such as `session_state_policy`, `defer_priority`, and `execution_isolation`.

The important part is the model: explicit allow, explicit deny, or approval required. If nothing matches, the runtime denies.

Start with [Policy YAML Schema](/policies/yaml-schema/) for the field list, then read [Rules and Matching](/policies/rules-and-matching/) for precedence and wildcard behavior.

For policy packs, see [Policy Packs](/policies/policy-packs/).
