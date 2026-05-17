---
title: faramesh run
description: Launch an agent with OS sandboxing, broker stripping, and SDK autoload.
---

```bash
faramesh run [--enforce auto|full|minimal|off] [--broker] [--agent-id ID] [--workspace DIR] -- COMMAND [ARGS...]
```

Wraps your agent process with:

| Layer | Linux | macOS |
|-------|-------|-------|
| Syscall filter | seccomp-BPF (denies `kill`/`tkill`/`tgkill`) | — |
| Filesystem | Landlock | Seatbelt (`sandbox-exec`) |
| Credentials | `--broker` strips ambient API keys | same |
| SDK | sets `FARAMESH_AUTOLOAD=1` | same |

Example:

```bash
faramesh apply   # or faramesh dev
faramesh run --broker --agent-id my-agent -- python agent.py
```

See [Security model](/security/) and [Enforcement](/concepts/enforcement/).
