---
title: What is FPL?
---

Faramesh Policy Language is the default syntax for `governance.fms`. YAML and JSON express the same AST.

```fpl
agent "my-agent" {
  default deny
  rate_limit "stripe/*": 10 per minute
  rules { permit health/* }
}
```

Equivalent YAML uses `rate_limits` and `rules` lists. See the spec in the core repository `docs/internal/FARAMESH.md`.

Next: [Registry](/registry/).
