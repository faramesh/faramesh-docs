---
title: faramesh check
description: Validate governance.fms without starting the daemon.
---

```bash
faramesh check [--dir DIR]
```

Static validation: imports, provider references, `env()` resolution, `deny!` conflicts, and syntax. Prints `✓ governance.fms valid` on success.

`faramesh apply` runs check with **required environment variables**; `check` alone does not require env unless you pass validation flags that reference providers.
