---
title: faramesh plan
description: Preview compile and runtime changes before apply.
---

```bash
faramesh plan [--dir DIR] [--format text|json]
```

Compiles `governance.fms` and prints what would change at apply: rule diffs, new providers, budget/egress changes, and optional WAL decision deltas. Exit `0` when compile succeeds; non-zero on validation errors (same family as `check`).

Use before production `apply` in CI or locally.
