---
title: faramesh dev
description: Run governance locally with in-process vault, identity, and KMS stubs.
---

```bash
faramesh dev [--dir DIR]
```

Compiles `governance.fms`, wires **dev-vault**, **dev-spiffe**, and **dev-kms** when you have not declared providers, starts the daemon on a Unix socket, and uses an **in-memory WAL**.

See [Run Faramesh locally](/dev/) for stub behavior. For production enforcement and persistent audit, use [faramesh apply](/cli/apply/).
