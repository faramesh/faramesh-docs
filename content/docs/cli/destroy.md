---
title: faramesh destroy
description: Tear down the local stack runtime and optional state.
---

```bash
faramesh destroy [--dir DIR]
```

Stops the daemon for the stack, removes the runtime socket metadata, and clears local state according to your stack configuration. Does not delete `governance.fms` unless you pass flags documented in `faramesh destroy --help`.

Use before re-`init` on the same directory or when switching from `dev` to a clean `apply`.
