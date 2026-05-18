---
title: faramesh destroy
description: Tear down the local stack runtime, optionally remove compiled artifacts and the WAL, and reset to a clean slate.
---

`faramesh destroy` is the cleanup command. It stops the daemon, clears the runtime socket, optionally removes compiled artifacts and the WAL, and gets you back to a state where `faramesh init` (or a fresh `apply`) starts cleanly.

It does **not** delete `governance.fms`. Your source policy is always safe.

## Usage

```bash title="Terminal"
faramesh destroy [--dir DIR] [--keep-wal] [--keep-state] [--yes]
```

| Flag | Description |
|------|-------------|
| `--dir DIR` | Stack directory. Defaults to the current directory. |
| `--keep-wal` | Stop the daemon and clear runtime, but preserve the WAL on disk. |
| `--keep-state` | Stop the daemon but preserve compiled artifacts in `.faramesh/`. |
| `--yes` | Skip the interactive confirmation. Required in CI. |

## What it removes

By default, `destroy` removes:

| Path | Contents |
|------|----------|
| `~/.faramesh/runtime/faramesh.sock` | Unix socket the daemon was listening on |
| `~/.faramesh/runtime/daemon.pid` | PID file |
| `<stack>/.faramesh/policy.bin` | Compiled AST |
| `<stack>/.faramesh/bin/agent` | Generated launcher |
| `<stack>/.faramesh/runtime/agent.env` | Generated env file |
| `<stack>/.faramesh/runtime/cli.path` | CLI path indirection |
| `<stack>/.faramesh-wal/` | The Write-Ahead Log (DPRs) — **unless `--keep-wal`** |
| `<stack>/.faramesh-data/` | SQLite store and HMAC keys — **unless `--keep-state`** |

It does **not** remove:

- `governance.fms` and any `governance.fms.lock`
- Provider binaries cached in `~/.faramesh/cache/`
- Anything outside the stack directory

## What happens, in order

```text title="destroy pipeline"
1.  Send SIGTERM to the daemon (graceful shutdown).
2.  If supervised_command was running, the agent receives SIGINT first.
3.  Wait up to the configured timeout (default 10s).
4.  If still running, SIGKILL.
5.  Remove the socket and pid file.
6.  Remove .faramesh/policy.bin and .faramesh/bin/.
7.  If not --keep-wal: remove the WAL.
8.  If not --keep-state: remove the SQLite store.
9.  Print summary.
```

The daemon's `POST_SHUTDOWN` hook (if you've configured one) runs before step 5.

## Output

```text title="Output"
$ faramesh destroy
This will stop the daemon and remove:
  /Users/you/.faramesh/runtime/faramesh.sock
  ./.faramesh/policy.bin
  ./.faramesh/bin/agent
  ./.faramesh-wal/
  ./.faramesh-data/

Continue? [y/N] y
✓ daemon stopped (pid 42189)
✓ runtime socket removed
✓ compiled artifacts removed
✓ WAL removed (1,432 records)
✓ stack destroyed
```

With `--keep-wal`:

```text title="Output"
$ faramesh destroy --keep-wal
✓ daemon stopped
✓ runtime socket removed
✓ compiled artifacts removed
→ WAL kept at ./.faramesh-wal/  (1,432 records preserved for audit)
✓ stack destroyed
```

## When to use it

| Scenario | Command |
|----------|---------|
| Switching from `dev` to a clean `apply` | `faramesh destroy` |
| Resetting before re-`init` on the same directory | `faramesh destroy` |
| Cleaning up between integration tests | `faramesh destroy --yes` |
| Stopping production but preserving audit trail | `faramesh destroy --keep-wal` |
| Decommissioning a stack permanently | `faramesh destroy` then `rm governance.fms` |

## Difference from `apply --stop`

| Command | Stops daemon | Removes socket | Removes compiled AST | Removes WAL |
|---------|:---:|:---:|:---:|:---:|
| `faramesh apply --stop` | ✓ | ✓ | — | — |
| `faramesh destroy` | ✓ | ✓ | ✓ | ✓ (default) |
| `faramesh destroy --keep-wal` | ✓ | ✓ | ✓ | — |

Use `apply --stop` when you'll restart with the same policy. Use `destroy` when you want a clean slate or are switching environments.

## Audit consequences of removing the WAL

The WAL is your tamper-evident audit trail. **Removing it is destructive and irreversible.** For any stack that has produced production decisions, archive the WAL first:

```bash title="Terminal"
faramesh audit export --format json > audit-$(date +%Y%m%d).json
faramesh destroy --keep-wal
```

For dev/CI stacks, removing the WAL is fine. The records are tagged as dev anyway.

## What's next

- [`faramesh apply --stop`](/cli/apply/#stopping-the-daemon): softer alternative.
- [`faramesh audit export`](/cli/audit/): archive the WAL before destroy.
- [`faramesh init`](/cli/init/): start a fresh stack after destroy.
