---
title: faramesh apply
description: Compile governance.fms and start or reload the enforcement daemon.
---

```bash
faramesh apply [--dir DIR] [--check-uid] [--require-uid-separation]
```

Runs `check` with environment validation, compiles artifacts, downloads registry provider binaries when declared, and starts (or reloads) the daemon.

| Platform | Enforcement note |
|----------|------------------|
| Linux | OS-tier seccomp/Landlock when configured in policy |
| macOS | Application-tier only; CLI prints a darwin notice |
| Windows | Network proxy enforcement; CLI prints a windows notice |

Use `faramesh apply --stop` to shut down the daemon without recompiling.

Optional `runtime { immutable_config = true }` locks `governance.fms` on disk after a successful apply (Linux: `chattr +i`, macOS: `uchg`).
