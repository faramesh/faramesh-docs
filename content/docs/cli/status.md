---
title: faramesh status
description: Daemon health, socket path, and runtime profile.
---

```bash
faramesh status [--dir DIR] [--json]
```

Reports whether the governance daemon is running, PID, Unix socket path, policy hash, and runtime mode (`enforce` / `audit` / `shadow`). Use after `faramesh dev` or `faramesh apply` to confirm the stack is reachable.

If the socket exists but govern calls return `DAEMON_NOT_READY`, the daemon is still in **INITIALIZING** (WAL replay). Retry after a second or inspect daemon logs under `.faramesh/`.
