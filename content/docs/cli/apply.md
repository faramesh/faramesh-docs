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
  os_tier                   = true
  strip_ambient_credentials = true
  agent_enforce_profile     = "full"
  supervised_command        = "python agent.py"   # optional: daemon-managed child
}
```

| Field | Behavior |
|-------|----------|
| `os_tier` | Linux: seccomp + Landlock; macOS: Seatbelt — via `.faramesh/bin/agent` or daemon supervisor |
| `strip_ambient_credentials` | Removes ambient broker secrets from the agent child env |
| `agent_enforce_profile` | `full`, `minimal`, or `off` for `__agent-exec` |
| `supervised_command` | Daemon launches and supervises this process after `READY` (no extra CLI) |
| `immutable_config` | Locks `governance.fms` after apply |

Start manually with `.faramesh/bin/agent -- …`, or set `supervised_command` and let `faramesh apply` start the child.

Use `faramesh apply --stop` to shut down the daemon.

Optional `runtime { immutable_config = true }` locks `governance.fms` on disk after apply (Linux: `chattr +i`, macOS: `uchg`).
