---
title: Policy Evaluation Internals
description: How the policy engine processes rules and resolves conflicts.
---

The core rule engine is simple on purpose: load YAML, compile expressions, evaluate top to bottom, and stop at the first match.

The Go schema’s `Match` structure gives you the main controls: tool glob, HTTP-aware fields, and an expression-based `when` clause. The CLI’s `policy validate`, `policy test`, and `policy simulate` commands are the easiest way to inspect what the engine is doing.

Conflict resolution is not magical. If two rules could match, the one earlier in the file wins.

See [Rules and Matching](/policies/rules-and-matching/) and [The Policy Engine](/concepts/policy-engine/).
