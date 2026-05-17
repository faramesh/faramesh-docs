---
title: FPL language reference
description: Grammar, types, and every construct in the Faramesh Policy Language.
---

**FPL**. Faramesh Policy Language, is the default syntax for `governance.fms`. It compiles to a deterministic AST that the daemon evaluates. YAML and JSON encode the same AST.

This page is the language reference. For block semantics see [Stack reference](/stack/).

## File shape

```hcl title="governance.fms"
# Optional imports
import "github.com/faramesh/faramesh-registry/frameworks/langgraph@1.0.0"
import "github.com/faramesh/faramesh-registry/policies/stripe@1.3.0" as stripe_rules

# Top-level configuration blocks
runtime  { ... }
provider "vault" { ... }
identity "spire-default" { ... }
trust    { ... }

# One or more agents
agent "my-agent" { ... }
```

Order is not significant. Comments start with `#` and run to end of line.

## Literals and types

| Type | Examples |
|------|----------|
| String | `"hello"`, `"api.example.com"` |
| Number | `42`, `3.14`, `1e3` |
| Money | `$500`, `$10.00` (number with a `$` prefix; same scalar at runtime) |
| Bool | `true`, `false` |
| Identifier | `permit`, `deny`, `stripe`, `myproject-agent` |
| Glob | `stripe/*`, `api/v1/*` (used in rules, rate limits) |
| Environment | `env("VAULT_TOKEN")` (resolved at compile time) |
| List | `["a", "b", "c"]` |

All strings are UTF-8. Identifiers may contain `[A-Za-z0-9_-]`. Tool names and rule patterns use `/` as a namespace separator.

## Imports

```hcl title="governance.fms"
import "<registry-host>/<path>@<semver>"
import "<registry-host>/<path>@<semver>" as <alias>
```

- Pinned semver is required. `@latest` is rejected at `faramesh check`.
- Paths follow `kind/name`: `frameworks/<id>`, `policies/<id>`, `providers/<id>`.
- An alias is optional; you may reference the imported AST through it.

## `runtime`

```hcl title="governance.fms"
runtime {
  mode             = "enforce"
  wal_dir          = "./faramesh-wal"
  backend          = "sqlite"
  socket           = "/tmp/faramesh.sock"
  http_listen      = "127.0.0.1:8080"
  mcp_proxy_port   = 8081
  cold_start_grace = "5s"
}
```

`runtime` accepts string, number, bool, or `env("...")` values. Unknown fields are reported by `faramesh check`.

## `provider`

```hcl title="governance.fms"
provider "<local-name>" {
  type = "vault"
  addr = env("VAULT_ADDR")
  ...
}
```

The `type` field selects the provider. The remaining fields are the provider's schema (see [Providers](/providers/)).

## `identity`

```hcl title="governance.fms"
identity "<local-name>" {
  type         = "spiffe"
  socket       = "/run/spire/agent.sock"
  trust_domain = "corp.faramesh.dev"
}
```

## `trust`

A free-form block of trust-root declarations parsed line-by-line. Used to verify signed registry artifacts.

```hcl title="governance.fms"
trust {
  key "github.com/faramesh/faramesh-registry" ed25519:MCowBQYDK2VwAyEA...
}
```

## `agent`

```hcl title="governance.fms"
agent "<id>" {
  default deny
  model      = "claude-sonnet-4"
  framework  = "langgraph"
  version    = "1.0.0"
  rules      { ... }
  budget     daily { ... }
  rate_limit "<pattern>": <n> per <window>
  redact     <tool> args: ["<path>", ...]
  egress     { ... }
  model_policy { ... }
  session    { ... }
  spawn      { ... }
  completion_gate { ... }
  enforcement { ... }
  alert      { ... }
  delegate   { ... }
  ambient    { ... }
  credential { ... }
  selector   { ... }
  phase      { ... }
  var        <key> = <value>
}
```

The `agent` block accepts the inner blocks below, each described in detail.

### `rules`

```hcl title="governance.fms"
rules {
  permit <tool> [if <condition>] [host <host>] [method <verb>] [path <path>]
  defer  <tool> [if <condition>]
  deny   <tool> [if <condition>] [reason "<message>"]
}
```

Effects: `permit`, `defer`, `deny`. Rules are checked top to bottom; the first match wins. If nothing matches, the agent's `default` effect applies (`deny` by convention).

`<tool>` can be:

- A bare identifier: `send_email`
- A namespaced name: `stripe/charge`
- A glob: `stripe/*`, `api/v1/*`

### Conditions

`if` clauses are boolean expressions over the action payload.

| Operator | Example |
|----------|---------|
| `==` `!=` | `tool == "stripe/charge"` |
| `<` `<=` `>` `>=` | `amount < $500` |
| `in` | `currency in ["USD", "EUR"]` |
| `and` `or` `not` | `amount < $500 and currency == "USD"` |
| `matches` | `path matches "/v1/[0-9]+"` |

Available variables in expressions:

- `tool`, `agent`, `action`, `model`
- `args.<field>`, flattened argument paths (e.g. `args.amount`)
- `host`, `method`, `path`, `query.<k>`, `headers.<k>` (when governing HTTP)
- `principal`, `principal.email`, `principal.groups`
- `time.hour`, `time.weekday`, `time.now`

### `rate_limit`

```hcl title="governance.fms"
rate_limit "<glob>": <n> per <window>
```

`<window>` ∈ { `second`, `minute`, `hour`, `day` }.

### `redact`

```hcl title="governance.fms"
redact <tool> args: ["<path>", "<path>", ...]
```

Argument paths are dot-separated for nested objects: `payment.card.number`.

### `budget`

```hcl title="governance.fms"
budget <id> {
  max       $<amount>
  daily     $<amount>      # optional explicit daily cap
  max_calls <number>
  warn_at   <fraction>     # 0–1
  on_exceed deny | defer | audit
}
```

Common ids: `session`, `daily`. Custom ids are allowed.

### `egress`

```hcl title="governance.fms"
egress {
  allow = ["<host-glob>", ...]
  deny  = ["<host-glob>", ...]
}
```

### `model_policy`

```hcl title="governance.fms"
model_policy {
  allow = ["claude-sonnet-4", "gpt-4.1-mini"]
}
```

### `session`

```hcl title="governance.fms"
session {
  max_duration = "30m"
  idle_timeout = "5m"
}
```

### `spawn`

```hcl title="governance.fms"
spawn {
  max_concurrent = 3
  allowed_types  = ["analyst", "researcher"]
}
```

### `completion_gate`

```hcl title="governance.fms"
completion_gate {
  require "no_pending_approvals"
  require "budget_under_limit"
  require "no_uncommitted_writes"
}
```

### `enforcement`

```hcl title="governance.fms"
enforcement {
  mcp_proxy_port = 8081
  os_tier        = true
}
```

### `alert`

```hcl title="governance.fms"
alert {
  on     = "deny"
  notify = "slack://#sec-alerts"
}
```

`on` values: `deny`, `defer`, `permit`, `budget_warning`, `budget_exceeded`, `rate_exceeded`.

`notify` schemes: `slack://`, `email://`, `pagerduty://`, `webhook://`.

### `delegate`

```hcl title="governance.fms"
delegate {
  target_agent = "researcher"
  scope        = "read-only"
  ttl          = "10m"
  ceiling      = "permit"
}
```

### `phase`

Time-bounded rule sets, used for phased rollouts.

```hcl title="governance.fms"
phase "audit-only" {
  duration = "24h"
  next     = "enforce"
  tools    = ["stripe/charge"]
  rules { permit stripe/charge }
}
```

### `var`

Reusable strings inside the agent block.

```hcl title="governance.fms"
var prod_host = "api.production.example.com"

rules {
  permit api/health host prod_host
}
```

## Top-level flat rules (v0 compatibility)

For tiny stacks you can declare flat rules at the top level without an `agent` block:

```hcl title="governance.fms"
permit search_docs
defer  send_email
deny   stripe/payouts
```

These are equivalent to a single anonymous agent.

## YAML equivalents

```yaml title="config.yaml"
agent:
  - id: payments-bot
    default: deny
    rules:
      - { effect: permit, tool: "stripe/charge", condition: "amount < 500" }
      - { effect: defer,  tool: "stripe/refund" }
    rate_limits:
      - { pattern: "stripe/*", limit: 10, window: minute }
    redactions:
      - { tool: "stripe/charge", paths: ["card_number", "cvv"] }
    budgets:
      - { id: daily, max: 500, warn_at: 0.8, on_exceed: deny }
    egress:
      allow: ["api.stripe.com"]
```

## Compilation

```bash title="Terminal"
faramesh check          # parse + type-check
faramesh plan           # show resolved AST and decision diff
faramesh apply          # compile to .faramesh/ and start enforcement
```

Errors include file and line:

```
governance.fms:12: agent "payments-bot": rate_limit "stripe/*": expected 'per <window>'
```

## What's next

- [Stack reference](/stack/): block-by-block semantics
- [Providers](/providers/): every provider schema
- [CLI](/cli/): commands and flags
- [Denial codes](/errors/): runtime error payloads
