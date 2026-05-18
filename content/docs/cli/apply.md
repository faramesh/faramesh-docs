---
title: faramesh apply
description: Compile governance.fms and start (or reload) the enforcement daemon. Optionally enable OS-tier sandbox and supervised agent execution.
---

`faramesh apply` is the production command. It runs `check`, compiles `governance.fms` to a deterministic AST, downloads any registry-imported provider binaries (verifying signatures), starts the daemon (or hot-swaps policy if it's already running), and writes the artifacts that drive the agent supervisor and the OS-tier sandbox.

After apply, the daemon is the only thing trusted to enforce policy on this host. `governance.fms` is read **once** at apply time; the daemon does not re-read it between applies.

## Usage

```bash title="Terminal"
faramesh apply [--dir DIR] [--force] [--check-uid] [--require-uid-separation] [--stop]
```

| Flag | Description |
|------|-------------|
| `--dir DIR` | Stack directory. Defaults to the current directory. |
| `--force` | Apply even if `plan` reports unexpected diffs. Use with care. |
| `--check-uid` | Refuse to apply if the daemon would run as the same UID as the agent. |
| `--require-uid-separation` | Same as above, but a hard error in non-root environments. |
| `--stop` | Stop the daemon for this stack and remove the runtime socket. |

## What happens, in order

```text title="apply pipeline"
1.  faramesh check        (parse + type-check)
2.  resolve registry imports + verify signatures
3.  download provider binaries (idempotent, cache-aware)
4.  compile governance.fms → .faramesh/policy.bin
5.  write .faramesh/runtime/agent.env
6.  write .faramesh/bin/agent (launcher)
7.  write .faramesh/runtime/cli.path
8.  start (or hot-swap) the daemon
       ├─ STARTING
       ├─ INITIALIZING (open WAL, replay, init providers, verify DPR chain)
       └─ READY → socket opens → SDK calls evaluated
9.  optional: agent supervisor launches runtime { supervised_command }
10. optional: lock governance.fms (chattr +i / uchg) if immutable_config = true
```

`apply` is **idempotent**. Running it twice with no policy change is a no-op (it returns immediately after step 4 once it sees the AST hash hasn't changed).

## After apply, start your agent

You have two options:

### Option A. Generated launcher

`apply` writes `.faramesh/bin/agent` for you:

```bash title="Terminal"
.faramesh/bin/agent -- python your_agent.py
```

The launcher loads `.faramesh/runtime/agent.env`, applies the OS sandbox if configured, strips ambient credentials, and execs your command. You don't need to remember any flags.

### Option B. Daemon-supervised agent (recommended)

Set `runtime { supervised_command = "python your_agent.py" }` and the daemon launches the agent itself after reaching `READY`:

```hcl title="governance.fms"
runtime {
  os_tier                   = true
  agent_enforce_profile     = "full"
  supervised_command        = "python your_agent.py"
  strip_ambient_credentials = true
}
```

```bash title="Terminal"
faramesh apply
# That's it — the daemon starts the agent for you with the sandbox applied.
```

→ Detail: [Architecture: agent supervisor and OS-tier sandbox](/concepts/architecture/#3-the-agent-supervisor-and-os-tier-sandbox).

## Runtime fields that change apply behavior

| Field | Behavior |
|-------|----------|
| `os_tier` | Linux: seccomp + Landlock; macOS: Seatbelt — applied by `.faramesh/bin/agent` and the daemon supervisor |
| `strip_ambient_credentials` | Removes broker secrets from the agent child env at exec |
| `agent_enforce_profile` | `full`, `minimal`, or `off` — passed to `__agent-exec` |
| `supervised_command` | Daemon launches and supervises this process after `READY` |
| `immutable_config` | Locks `governance.fms` after apply (Linux: `chattr +i`, macOS: `uchg`) |
| `cold_start_deny_window` | How long calls return `DAEMON_NOT_READY` while the daemon is initializing |

→ Full table: [Stack reference → runtime](/stack/#runtime).

## Output

```text title="Output"
$ faramesh apply
✓ governance.fms valid
✓ governance.fms compiled
✓ providers verified (vault, kms, splunk)
→ runtime started (pid=42189)
→ Unix socket: /Users/you/.faramesh/runtime/faramesh.sock
→ agent launcher: ./.faramesh/bin/agent -- python your_agent.py
→ OS tier: Seatbelt sandbox-exec (runtime { os_tier = true }) via .faramesh/bin/agent
→ config locked: ./governance.fms
```

## Stopping the daemon

```bash title="Terminal"
faramesh apply --stop
```

This sends `SIGTERM`, waits for clean shutdown, removes the runtime socket, and clears the supervisor's child PIDs. If the daemon is supervising an agent, that agent receives `SIGINT` first.

If the daemon doesn't exit cleanly within the timeout, `--stop` will report it and leave you to resolve manually. The daemon's PID is in `~/.faramesh/runtime/daemon.pid`.

## Hot-swap (reapply)

Running `faramesh apply` while the daemon is already running performs an **atomic AST swap**:

1. Parse and compile the new `governance.fms`.
2. Validate that every referenced provider and identity resolves.
3. Replay history against the new AST (same as `plan`).
4. If validation passes, swap the in-memory AST in a single pointer write.
5. Persist the new policy version into the WAL with a hash so `audit verify` continues unbroken.

In-flight calls that have already passed step 3 of the [pipeline](/concepts/enforcement/) finish under the **old** AST. New calls see the new AST. There is no window where some rules are old and some are new for the same call.

## Failure modes

| Failure | What happens |
|---------|---------------|
| `check` fails | apply aborts before touching the daemon |
| Provider signature mismatch | apply aborts; daemon keeps running on previous policy |
| Provider unreachable at init | apply fails after compile; previous daemon stays up |
| WAL corruption detected | daemon refuses to start, exits non-zero |
| Cold-start budget exceeded | daemon enters `HALT`, exits non-zero; previous policy remains via WAL |

`apply` always **fails closed**. A failed apply leaves the previous policy enforcing, never an empty AST.

## What's next

- [Architecture](/concepts/architecture/): daemon lifecycle, supervisor, sandbox.
- [`faramesh status`](/cli/status/): confirm the daemon is `READY` and providers are healthy.
- [`faramesh plan`](/cli/plan/): preview before apply.
- [From dev to production](/guides/from-dev-to-prod/): full migration guide.
