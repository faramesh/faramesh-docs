---
title: faramesh explain
description: Why a decision or approval looks the way it does.
---

```bash
faramesh explain approval <approval-id>
faramesh explain agent <agent-id>
faramesh explain run <run-id>
```

Operator debugging: maps a defer/deny back to rule refs, session state, and WAL context without reading raw JSON by hand.

Requires a running daemon with access to the same data dir as `apply`.
