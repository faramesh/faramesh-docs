---
title: faramesh apply
description: Compile governance.fms and start or reload the enforcement daemon.
---

```bash
faramesh apply [--dir DIR] [--check-uid] [--require-uid-separation]
```

Runs `check` with environment validation, compiles artifacts, downloads registry provider binaries when declared, and starts (or reloads) the daemon.

After apply, start your agent with the generated launcher (no extra CLI flags):

```bash
.faramesh/bin/agent -- python your_agent.py
```

Configure OS sandboxing and credential stripping in `governance.fms`:

```hcl title="governance.fms"
runtime {
  os_tier = true
  strip_ambient_credentials = true
}
```

| Platform | `os_tier = true` |
|----------|------------------|
| Linux | seccomp-BPF + Landlock via `.faramesh/bin/agent` |
| macOS | Seatbelt (`sandbox-exec`) via `.faramesh/bin/agent` |

Use `faramesh apply --stop` to shut down the daemon.

Optional `runtime { immutable_config = true }` locks `governance.fms` on disk after apply (Linux: `chattr +i`, macOS: `uchg`).
