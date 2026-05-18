---
title: faramesh status
description: Check daemon health, lifecycle state, policy version, provider status, and current budget consumption.
---

`faramesh status` reports the runtime state of the daemon for the current stack. It's the first command you run when something looks wrong. And the command CI uses to confirm the daemon came up clean after `apply`.

## Usage

```bash title="Terminal"
faramesh status [--dir DIR] [--format text|json] [--watch]
```

| Flag | Description |
|------|-------------|
| `--dir DIR` | Stack directory. Defaults to the current directory. |
| `--format text \| json` | Output format. `json` is stable for scripting. |
| `--watch` | Refresh every two seconds until interrupted. |

## What it reports

```text title="Output"
$ faramesh status
Daemon
  state:          READY
  pid:            42189
  uptime:         12m 34s
  socket:         /Users/you/.faramesh/runtime/faramesh.sock
  policy hash:    5b3454b7f74a03ba
  policy source:  governance.fms (applied 2026-05-17T20:44:26Z)
  runtime mode:   enforce
  os tier:        on (Seatbelt)
  WAL backend:    sqlite (./faramesh-wal)

Providers
  vault           HEALTHY    last probe: 2s ago
  kms             HEALTHY    last probe: 2s ago
  splunk-sink     DEGRADED   last error: 503 Service Unavailable (retrying)

Budgets
  daily           $84.50 / $500.00   (16.9%)
  refunds_daily   $0.00  / $5000.00  (0.0%)

Approvals
  pending:        2
  oldest age:     14m
```

### Daemon section

| Field | Meaning |
|-------|---------|
| `state` | `STARTING`, `INITIALIZING`, `READY`, or `HALT`. SDK calls only succeed in `READY`. |
| `pid` | Process id from `~/.faramesh/runtime/daemon.pid`. |
| `socket` | Unix socket path the SDK shim and CLI talk to. |
| `policy hash` | First 8 bytes of the AST hash. Changes on every `apply`. |
| `runtime mode` | `enforce`, `audit`, or `shadow`. |
| `os tier` | `on` (with mechanism) or `off`. |

### Providers section

Each provider declared in `governance.fms` reports `HEALTHY`, `DEGRADED`, or `DOWN` plus its last probe time. Degraded providers don't deny tool calls outright. But `CREDENTIAL_UNAVAILABLE` denials become more likely.

### Budgets section

Per-budget consumption. Useful for confirming whether the agent has spent anything in the current window without running an audit query.

### Approvals section

Count of pending approvals and the age of the oldest. If the oldest is older than your team's SLA, that's a paging signal.

## Lifecycle states

The daemon goes through explicit states. `status` shows the current one:

| State | Meaning | What you can do |
|-------|---------|-----------------|
| `STARTING` | Process is up; no I/O yet | Wait |
| `INITIALIZING` | Opening WAL, replaying state, loading policy, init providers | Wait; SDK calls return `DAEMON_NOT_READY` |
| `READY` | Socket open, calls evaluated | Normal operation |
| `HALT` | Cold-start budget exceeded or fatal init error | Read daemon logs, fix, re-`apply` |

→ Detail: [Architecture: daemon lifecycle](/concepts/architecture/#1-the-daemon-lifecycle).

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Daemon is `READY` and all providers are `HEALTHY`. |
| `1` | Daemon is not running, or socket is missing. |
| `2` | Daemon is running but in `INITIALIZING` (still warming up). |
| `3` | Daemon is `READY` but at least one provider is `DEGRADED` or `DOWN`. |

CI uses `[ "$(faramesh status -q)" = "0" ]` as a smoke check after `apply`.

## JSON output

```bash title="Terminal"
faramesh status --format json
```

```json title="status.json"
{
  "daemon": {
    "state": "READY",
    "pid": 42189,
    "uptime_seconds": 754,
    "socket": "/Users/you/.faramesh/runtime/faramesh.sock",
    "policy_hash": "5b3454b7f74a03ba",
    "policy_source": "governance.fms",
    "applied_at": "2026-05-17T20:44:26Z",
    "runtime_mode": "enforce",
    "os_tier": { "enabled": true, "mechanism": "seatbelt" },
    "wal": { "backend": "sqlite", "path": "./faramesh-wal" }
  },
  "providers": [
    { "name": "vault", "status": "HEALTHY", "last_probe_seconds_ago": 2 },
    { "name": "splunk-sink", "status": "DEGRADED", "last_error": "503 Service Unavailable" }
  ],
  "budgets": [
    { "id": "daily", "spent_usd": 84.50, "max_usd": 500.0 }
  ],
  "approvals": { "pending": 2, "oldest_age_seconds": 840 }
}
```

The schema is stable across patch releases.

## Common scenarios

### "My agent is getting `DAEMON_NOT_READY`"

Run `faramesh status`. If state is `INITIALIZING`, wait for `READY`. If it's stuck for more than your `cold_start_deny_window`, daemon logs (`~/.faramesh/runtime/daemon.log`) tell you which init step is slow.

### "Calls are timing out"

Check the providers section. A `DEGRADED` Vault means provider broker latency is high. Calls may eventually succeed but slowly.

### "Did my apply take effect?"

`status` shows `policy hash` and `applied_at`. Compare to the hash printed by your `apply` run.

### "Is the daemon even running?"

```bash title="Terminal"
faramesh status -q
echo $?  # 0 if running and READY; 1 if not
```

## What's next

- [Troubleshooting](/troubleshooting/): full failure-mode catalog.
- [Architecture](/concepts/architecture/): what each lifecycle state means.
- [`faramesh audit verify`](/cli/audit/): verify the chain after a restart.
- [Denial codes](/errors/): what `DAEMON_NOT_READY` and friends mean to the SDK.
