---
title: The governance.fms file
description: Every block you can declare in a Faramesh stack, with examples.
---

A Faramesh **stack** is a directory containing one governance file:

- `governance.fms` — FPL (recommended)
- `governance.fms.yaml` — same AST in YAML
- `governance.fms.json` — same AST in JSON

`faramesh apply` compiles this file once into a deterministic policy AST in `.faramesh/` and the daemon enforces it. The daemon does not watch the file at runtime — to change policy you re-run `faramesh apply`.

## Top-level structure

```fpl
import   "registry.faramesh.dev/frameworks/langgraph@1.0.0"
import   "registry.faramesh.dev/policies/pci-dss@1.2.0" as pci

runtime  { ... }
provider "vault"  { ... }
identity "spire-default" { ... }
trust    { ... }

agent "my-agent" {
  default deny
  rules     { ... }
  rate_limit ...
  redact    ...
  egress    { ... }
  model_policy { ... }
  session   { ... }
  spawn     { ... }
  completion_gate { ... }
  enforcement { ... }
  alert     { ... }
  budget daily { ... }
}
```

The blocks below are in the order you typically declare them.

## `import`

Pull a versioned artifact from a registry. Imports are resolved at `faramesh check`.

```fpl
import "registry.faramesh.dev/frameworks/langgraph@1.0.0"
import "registry.faramesh.dev/policies/stripe@1.3.0" as stripe_rules
import "registry.faramesh.dev/providers/vault@2.1.0"
```

- A pinned semver is required. `@latest` is rejected.
- `as <alias>` lets you reference imported rules by a short name.
- See [Registry](/registry/) for artifact kinds.

## `runtime`

Top-level runtime configuration for the daemon.

```fpl
runtime {
  mode             = "enforce"     # or "audit"
  wal_dir          = "./faramesh-wal"
  backend          = "sqlite"      # sqlite | postgres
  socket           = "/tmp/faramesh.sock"
  http_listen      = "127.0.0.1:8080"
  mcp_proxy_port   = 8081
  cold_start_grace = "5s"
}
```

| Field | Description |
|-------|-------------|
| `mode` | `enforce` blocks denied actions; `audit` lets everything through but logs decisions. |
| `wal_dir` | Where DPRs and the WAL live. |
| `backend` | State backend. Use `postgres` in production. |
| `socket` | Unix socket the SDK shim connects to. |
| `http_listen` | HTTPS evaluate endpoint for remote SDKs and Lambda-style runtimes. |
| `mcp_proxy_port` | Port the MCP proxy binds (for Claude Code, Cursor, OpenCode). |
| `cold_start_grace` | Window after startup during which calls are denied with `DAEMON_NOT_READY` instead of evaluated. |

## `provider`

External credential, identity, KMS, audit, and cost backends. The daemon calls them over gRPC.

```fpl
provider "vault" {
  type      = "vault"
  addr      = env("VAULT_ADDR")
  token     = env("VAULT_TOKEN")
  mount     = "kv/data/payments"
  namespace = "platform"
}

provider "audit-splunk" {
  type    = "splunk-sink"
  url     = env("SPLUNK_URL")
  token   = env("SPLUNK_HEC_TOKEN")
  index   = "faramesh-decisions"
}
```

See [Providers](/providers/) for the full catalog and schema for each type.

## `identity`

Agent identity and workload attestation source.

```fpl
identity "spire-default" {
  type         = "spiffe"
  socket       = "/run/spire/agent.sock"
  trust_domain = "corp.faramesh.dev"
}
```

## `trust`

Public-key trust roots for verifying signed registry artifacts. The daemon verifies provider binaries and policy packs against this set at apply time.

```fpl
trust {
  key "registry.faramesh.dev" ed25519:MCowBQYDK2VwAyEA...
}
```

## `agent`

The unit of governance. One `agent` block per agent identity.

```fpl
agent "payments-bot" {
  default deny
  model     = "claude-sonnet-4"
  framework = "langgraph"
  version   = "1.0.0"

  rules { ... }
  rate_limit ...
  redact ...
  egress { ... }
  budget daily { ... }
}
```

| Field | Description |
|-------|-------------|
| `default` | `deny` (recommended) or `permit`. Effect when no rule matches. |
| `model` | Optional model identifier for `model_policy` checks. |
| `framework` | Optional framework name, used for evidence and metrics. |
| `version` | Optional semver for this policy. |

### `rules`

The core decision block. Rules are evaluated top to bottom; the first match wins.

```fpl
rules {
  permit search_docs
  permit stripe/charge if amount < $500
  defer  stripe/refund
  deny   stripe/payouts

  permit api/* method GET host "api.example.com"
  permit api/* method POST host "api.example.com" path /v1/*
}
```

Effects: `permit`, `deny`, `defer` (hold for human approval).

Conditions can match on argument values, HTTP method/host/path/query/headers, time-of-day, and any field in the action payload. See the [FPL grammar](/fpl/#conditions) for the full list.

### `budget`

Spending and call-count ceilings.

```fpl
budget daily {
  max       $500
  warn_at   0.8
  on_exceed deny
  max_calls 5000
}
```

| Field | Description |
|-------|-------------|
| `max` | Daily/session ceiling in dollars. |
| `daily` | Optional explicit daily cap if the block id is not `daily`. |
| `max_calls` | Daily cap on number of tool calls. |
| `warn_at` | Fraction (0–1) of `max` at which `BUDGET_WARNING` is emitted. |
| `on_exceed` | `deny` (default), `defer`, or `audit`. |

You may declare multiple budgets per agent — typical pattern is `session` plus `daily`.

### `rate_limit`

Token-bucket limits per tool pattern.

```fpl
rate_limit "stripe/*":   10 per minute
rate_limit "send_email": 50 per hour
```

Pattern is `glob`-style (`*` matches any tool name segment). Window is `second`, `minute`, `hour`, or `day`.

### `redact`

Mask fields in arguments before they reach the tool and before they're recorded.

```fpl
redact stripe/charge args: ["card_number", "cvv"]
redact send_email    args: ["body"]
```

### `egress`

Network egress allow/deny list. Applied to outbound HTTP from the tool runtime when the tool is governed via the HTTP proxy tier.

```fpl
egress {
  allow = ["api.stripe.com", "*.faramesh.dev"]
  deny  = ["*.internal.corp"]
}
```

### `model_policy`

Restrict which models the agent is permitted to call.

```fpl
model_policy {
  allow = ["claude-sonnet-4", "gpt-4.1-mini"]
}
```

### `session`

Session bounds.

```fpl
session {
  max_duration = "30m"
  idle_timeout = "5m"
}
```

### `spawn`

Constrain agent-to-agent delegation.

```fpl
spawn {
  max_concurrent = 3
  allowed_types  = ["analyst", "researcher"]
}
```

### `completion_gate`

Block agent task completion until conditions are met.

```fpl
completion_gate {
  require "no_pending_approvals"
  require "budget_under_limit"
  require "no_uncommitted_writes"
}
```

If a gate fails, the agent receives `COMPLETION_BLOCKED` instead of being allowed to mark the task done.

### `enforcement`

Per-agent enforcement tier overrides.

```fpl
enforcement {
  mcp_proxy_port = 8081
  os_tier        = true     # Linux seccomp/Landlock
}
```

### `alert`

Emit alerts on specific decisions.

```fpl
alert {
  on     = "deny"
  notify = "slack://#sec-alerts"
}

alert {
  on     = "defer"
  notify = "email://oncall@example.com"
}
```

## YAML and JSON equivalents

The AST is identical across formats; you can mix nothing — pick one per stack.

```yaml
runtime:
  mode: enforce
  wal_dir: ./faramesh-wal

agent:
  - id: payments-bot
    default: deny
    rules:
      - { effect: permit, tool: "stripe/charge", condition: "amount < 500" }
      - { effect: defer,  tool: "stripe/refund" }
    rate_limits:
      - { pattern: "stripe/*", limit: 10, window: minute }
    budgets:
      - { id: daily, max: 500, warn_at: 0.8, on_exceed: deny }
```

## Validation

Faramesh validates structure, types, and references at compile time:

```bash
faramesh check
```

Errors include the file path and line number. See [Denial codes](/errors/) for the runtime error shapes returned to agents.

## What's next

- [FPL syntax](/fpl/) — grammar and language reference
- [Providers](/providers/) — provider catalog with config
- [CLI](/cli/) — `check`, `plan`, `apply`, and the rest
