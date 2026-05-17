---
title: How do I run faramesh dev?
---

```bash
faramesh dev [--dir DIR]
```

Dev mode compiles the stack, stubs absent providers (vault, SPIFFE, KMS), uses an in-memory WAL, and starts the daemon. No external infrastructure is required.

On macOS and Windows, OS-tier enforcement is not available; network proxy governance still applies.

Next: [Security](/security/).
