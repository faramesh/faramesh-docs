---
title: CLI reference
description: Every faramesh command, every flag, every example.
---

`faramesh` is the single binary you install. It groups commands into two tiers:

- **Core** — the day-to-day flow: `init`, `check`, `plan`, `apply`, `status`, `destroy`, `dev`, `test`, `explain`, `rollback`, `approvals`, `audit`, `credential`.
- **Operator** — operational sub-tools: `agent`, `bundle`, `auth`.

```bash
faramesh --help
faramesh <command> --help
```

## Lifecycle commands

### `faramesh init`

Generate `governance.fms` from your project layout. Never starts the daemon.

```bash
faramesh init [--dir DIR] [--offline] [--non-interactive] [--yaml | --json]
```

See [faramesh init](/init/) for framework detection rules.

### `faramesh check`

Parse `governance.fms`, resolve imports, and type-check.

```bash
faramesh check [--dir DIR] [--strict]
```

Exit codes:

- `0` — valid.
- `1` — syntax or schema error. The error line and column are printed.
- `2` — registry import unreachable. Combine with `--offline` to require all imports already resolved.

### `faramesh plan`

Compile policy and show what would change at apply.

```bash
faramesh plan [--dir DIR] [--format text|json]
```

Output includes:

- New, changed, and removed rules.
- New provider launches.
- Budget, rate-limit, and egress diffs.
- Decision diffs against the last 24h of WAL traffic.

### `faramesh apply`

Compile and start the daemon (or hot-swap policy if it's already running).

```bash
faramesh apply [--dir DIR] [--force]
```

`apply` always runs `check` first. Without `--force`, a failed `plan` aborts the apply.

### `faramesh status`

Report daemon health, policy version, and current budget consumption.

```bash
faramesh status [--format text|json]
```

### `faramesh destroy`

Stop the daemon and remove compiled artifacts in `.faramesh/`. Source files in `governance.fms` are left intact.

```bash
faramesh destroy [--dir DIR] [--keep-wal]
```

### `faramesh rollback`

Apply the previous policy version from the WAL.

```bash
faramesh rollback [--to VERSION]
```

## Run locally

### `faramesh dev`

Run Faramesh on your machine without external secret stores, KMS, or audit sinks. Built-in stubs fill in for missing providers. See [Run locally](/dev/).

```bash
faramesh dev [--dir DIR]
```

## Inspection

### `faramesh test`

Replay a fixture of tool calls against the current policy and compare to expected decisions.

```bash
faramesh test [--fixture FILE] [--fail-fast]
```

### `faramesh explain`

Show the full decision chain for a single action record.

```bash
faramesh explain <action-id>
```

The output includes which rule fired, the matching arguments, the provider lookups, and any redactions applied.

## Approvals {#approvals}

### `faramesh approvals list`

List every pending approval for the current stack.

```bash
faramesh approvals list [--agent AGENT] [--format text|json]
```

Alias: `faramesh approvals pending`.

### `faramesh approvals show`

Inspect one approval — context, agent identity, arguments (with redactions applied).

```bash
faramesh approvals show <approval-id>
```

### `faramesh approvals approve` / `deny`

Resolve a pending approval.

```bash
faramesh approvals approve <approval-id> [--reason "..."]
faramesh approvals deny    <approval-id> [--reason "..."]
```

### `faramesh approvals watch`

Stream pending approvals live.

```bash
faramesh approvals watch
```

### `faramesh approvals history`

Approval history for one agent.

```bash
faramesh approvals history [--agent AGENT] [--since 24h]
```

## Audit

### `faramesh audit tail`

Stream the decision log live.

```bash
faramesh audit tail [--agent AGENT] [--effect permit|deny|defer] [--format text|json]
```

### `faramesh audit verify`

Walk the hash chain in the WAL and verify signatures. Detects tampering.

```bash
faramesh audit verify [--from TIMESTAMP] [--to TIMESTAMP]
```

### `faramesh audit export`

Export decisions for a window in JSON or CSV.

```bash
faramesh audit export --from 2026-05-01 --to 2026-05-31 --format json > may.json
```

## Credentials

### `faramesh credential probe`

Test a provider connection from outside the daemon.

```bash
faramesh credential probe <provider-name>
```

### `faramesh credential preview`

Dry-run a `GetSecret` for a given action, without executing the tool.

```bash
faramesh credential preview --agent payments-bot --tool stripe/charge
```

## Operator commands

### `faramesh agent`

List, inspect, and manage agent state.

```bash
faramesh agent list
faramesh agent show <agent-id>
faramesh agent quiesce <agent-id>     # stop accepting calls
faramesh agent resume  <agent-id>
```

### `faramesh bundle`

Build an offline bundle for air-gapped stacks.

```bash
faramesh bundle [--out FILE.tar] [--include-providers]
```

The bundle resolves every import and signed binary so `faramesh apply --offline` works without network.

### `faramesh auth`

Authenticate against private registries.

```bash
faramesh auth login    --registry registry.internal
faramesh auth logout   --registry registry.internal
faramesh auth whoami
```

## Global flags

| Flag | Description |
|------|-------------|
| `--dir DIR` | Stack directory. Defaults to the current directory. |
| `--format text \| json` | Output format for commands that support it. |
| `--no-color` | Disable ANSI colors. |
| `--quiet` | Suppress non-essential output. |
| `--version` | Print the CLI version and exit. |

## Environment variables

| Variable | Used by | Description |
|----------|---------|-------------|
| `FARAMESH_REGISTRY_URL` | `check`, `apply`, `bundle` | Override the default registry. |
| `FARAMESH_TOKEN` | All registry-bound commands | Bearer token for private registries. |
| `FARAMESH_SOCKET` | SDKs and inspection tools | Unix socket the daemon listens on. |
| `FARAMESH_REMOTE_URL` | SDKs | Remote evaluator endpoint, used in Lambda / Cloud Run / serverless agents. |
| `FARAMESH_AGENT_ID` | SDKs | Override the agent identity for the current process. |

## What's next

- [Workflows](/flows/) — the three flows you'll use every day
- [Stack reference](/stack/) — what `governance.fms` accepts
- [Run locally](/dev/) — `faramesh dev` with no external infrastructure
