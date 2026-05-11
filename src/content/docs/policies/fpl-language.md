---
title: Faramesh Policy Language (FPL)
description: Complete reference for FPL, the first-class policy authoring language for Faramesh governance.
---

FPL (Faramesh Policy Language) is a domain-specific language for declaring agent governance policies with precision, readability, and runtime verifiability. It compiles to the same internal representation as YAML policies, but with richer syntax support for advanced features.

## Quick Start

```fpl
agent payment-bot {
  default deny

  budget session {
    max $500
    daily $2000
    max_calls 100
    on_exceed deny
  }

  rules {
    deny! shell/* reason: "never run shell"
    defer stripe/refund when amount > 500 notify: "finance"
    permit stripe/refund when amount <= 500
    permit read_customer
  }
}
```

## 1. File Format and Lexical Rules

- **Extension**: `.fpl`
- **Encoding**: UTF-8
- **Comments**: Line comments with `#`
- **Strings**: Both single and double quoted
- **Whitespace**: Flexible; blocks use `{ ... }`

```fpl
# This is a comment
agent my-agent {
  default deny  # inline comment also works

  var environment "production"
  var max_refund 1000
}
```

## 2. Top-Level Constructs

FPL documents can contain:

- `agent <id> { ... }` — declares an agent policy
- `system <id> { ... }` — declares system-wide settings
- `manifest ...` — topology and grant declarations
- flat rules outside blocks — valid at document level

**Runtime constraints**:
- At most one `agent` block
- At most one `system` block
- Top-level flat rules are evaluated in document order

## 3. Rule Syntax and Semantics

### Rule Form

```
effect tool [when <expr>] [notify: <target>] [reason: <message>]
```

### Effects

- `permit` (aliases: `allow`, `approve`) — allow tool call
- `deny` (aliases: `block`, `reject`) — block tool call
- `deny!` — strict deny with incident marking
- `defer` — route to human approver

### Tool Patterns

- **Exact**: `stripe/refund` — matches only that tool
- **Namespace glob**: `stripe/*` — matches all stripe tools
- **Catch-all**: `*` — matches any tool

Tool matching uses Go's `path.Match` glob semantics.

### Examples

```fpl
deny! shell/* reason: "never run shell"

defer stripe/refund when amount > 500 notify: "finance" reason: "high-value refund"

permit stripe/refund when amount <= 500

permit http/get when host matches "api.openai.com"

deny stripe/refund when principal.verified != true
```

## 4. Agent Block: Complete Field Reference

Inside `agent <id> { ... }`:

```fpl
agent payment-processor {
  # Basic metadata
  default deny
  model "gpt-4-turbo"
  framework "langchain"
  version "1.2.3"

  # Policy variables
  var max_single_transaction 5000
  var approval_threshold 1000

  # Cost and call controls
  budget session {
    max $5000
    daily $50000
    max_calls 500
    on_exceed deny
  }

  # Workflow phases
  phase intake {
    permit read_customer
    permit validate_payment_method
    duration 5m
    next processing
  }

  phase processing {
    defer stripe/charge when amount > threshold
    permit stripe/charge when amount <= threshold
    duration 30m
    next completion
  }

  # Approval flows and delegation
  delegate approval-worker {
    scope stripe/*
    ttl 2h
    ceiling approval
  }

  # Ambient limits (cross-session)
  ambient {
    max_customers_per_day 1000
    max_calls_per_day 50000
    max_data_volume 100mb
    on_exceed deny
  }

  # Context lookups
  selector customer-risk {
    source "https://risk-api.internal/customer"
    cache 5m
    on_unavailable deny
    on_timeout defer
  }

  # Credential metadata
  credential stripe {
    scope refund read_charge
    max_scope "refund:amount<=10000"
    backend vault
    path secret/data/stripe/prod
    ttl 15m
  }

  credential aws {
    scope s3:GetObject
    backend aws
    ttl 1h
  }

  # Policy rules
  rules {
    deny! shell/* reason: "no shell access"

    defer stripe/refund when args.amount > 5000 notify: "finance"
    permit stripe/refund when args.amount <= 5000

    permit read_customer when principal.verified == true
    deny read_customer when principal.verified != true
  }
}
```

## 5. Budget Block (Cost and Call Limits)

Control resource consumption per session:

```fpl
budget session {
  max $500              # session USD limit
  daily $10000          # daily USD limit
  max_calls 100         # call count cap
  on_exceed deny        # or defer
}
```

**Fields**:
- `max` — total session spend cap (optional)
- `daily` — 24-hour spend cap (optional)
- `max_calls` — tool call count limit (optional)
- `on_exceed` — effect when budget exceeded (`deny` or `defer`)

**Notes**:
- Currency symbol `$` is optional in numeric values
- At least one limit should be specified (multiple can be combined)
- `on_exceed defer` routes budget violations to human approval

## 6. Phase Block (Workflow Stages)

Define ordered stages of agent execution with tool visibility:

```fpl
phase intake {
  permit read_customer
  permit read_order
  deny shell/*
  duration 5m
  next processing
}

phase processing {
  permit stripe/charge
  defer stripe/refund when amount > 1000
  deny read_customer
  duration 30m
  next completion
}

phase completion {
  permit send_notification
  deny stripe/*
}
```

**Phase Fields**:
- Rules inside the phase (applied when agent is in that phase)
- `duration` — max time allowed in this phase
- `next` — next phase ID when duration expires

**Semantics**:
- Phases are enforced per-session
- Rules are evaluated in order: first matching phase rule applies
- Phase transitions are explicit via `next`

## 7. Delegate Block (Sub-Agent Permissions)

Authorize a sub-agent to act on this agent's behalf:

```fpl
delegate approval-worker {
  scope stripe/*
  ttl 2h
  ceiling approval
}

delegate data-processor {
  scope "read_customer read_order"
  ttl 1h
  ceiling inherited
}
```

**Fields**:
- `scope` — tool pattern(s) sub-agent can use
- `ttl` — delegation lifetime
- `ceiling` — constraints on sub-agent's scope
  - `inherited` — pass through parent's permissions
  - `approval` — require prior approval for sub-agent's calls

## 8. Ambient Block (Cross-Session Limits)

Track and limit aggregate activity across multiple sessions:

```fpl
ambient {
  max_customers_per_day 500
  max_calls_per_day 10000
  max_data_volume 5gb
  on_exceed deny
}
```

**Supported Limits**:
- `max_customers_per_day` — unique customer count in 24h window
- `max_calls_per_day` — tool calls in 24h window
- `max_data_volume` — data transferred in 24h window
- `on_exceed` — `deny` or `defer` when limit hit

## 9. Selector Block (Dynamic Context)

Fetch runtime data for conditional policy evaluation:

```fpl
selector customer-risk {
  source "https://risk-scoring.internal/customer"
  cache 5m
  on_unavailable deny
  on_timeout defer
}

selector rate-limit {
  source "https://api.internal/rate-limits"
  cache 30s
  on_unavailable defer
  on_timeout deny
}
```

**Fields**:
- `source` — HTTP endpoint to query (required)
- `cache` — TTL for cached response (optional, default no cache)
- `on_unavailable` — effect if endpoint 404s or missing data
- `on_timeout` — effect if request times out

**Available in expressions**: Selector data is accessible as `context.<selector-id>`

## 10. Credential Block (Brokered Secrets)

Declare which credentials tools need and how they should be provisioned:

```fpl
credential stripe {
  scope refund read_charge
  max_scope "refund:amount<=1000"
  backend vault
  path secret/data/stripe/live
  ttl 15m
}

credential aws {
  scope s3:GetObject s3:ListBucket
  backend aws
  ttl 1h
}

credential github {
  backend "1password"
  path "item/credential/github-token"
  ttl 8h
}
```

**Fields**:
- `scope` — API operations this credential grants access to
- `max_scope` — optional upper bound on actual scope
- `backend` — credential provider (`vault`, `aws`, `gcp`, `azure`, `1password`, `infisical`)
- `path` — lookup path within the backend
- `ttl` — credential lifetime before refresh

**Scope Mapping**:
- If scope entry contains `/` (e.g., `stripe/refund`), used as-is
- Shorthand without `/` (e.g., `refund`) expands with credential ID namespace
- Multiple scopes can be space or comma separated

**Runtime Effect**:
- Tools with credential blocks are automatically tagged with `credential:broker` and `credential:required`
- Daemon provisions credentials to a secure boundary, keeping them out of agent process memory

## 11. System Block (Global Settings)

Configure runtime-wide behavior:

```fpl
system {
  version "1.0"
  on_policy_load_failure deny
  max_output_bytes 1000000
}
```

**Fields**:
- `version` — FPL version (currently "1.0")
- `on_policy_load_failure` — effect if policy fails to load (`deny` or `deny_all`)
- `max_output_bytes` — maximum output size (must be >= 0)

## 12. Manifest Topology (Multi-Agent Orchestration)

Declare agent relationships and allowances:

```fpl
manifest orchestrator supervisor agent-1 agent-2

manifest grant supervisor to agent-1 max 100
manifest grant supervisor to agent-2 max 50 approval
manifest grant agent-1 to agent-3 max 25
```

**Grant Format**:
```
manifest grant <from-agent> to <to-agent> [max <count>] [approval]
```

- `max` — call count cap for this delegation
- `approval` — require prior approval for delegated calls

## 13. When Expression Environment (Complete)

### Objects and Fields

**`args`** — Raw tool arguments

```fpl
when args.amount > 100
when args.cmd contains "rm -rf"
when args_array_len("recipients") > 50
```

**`vars`** — Policy variables

```fpl
when args.amount > vars.max_transaction
```

**`session`** — Current session state

```fpl
session.call_count        # tool calls so far in session
session.history           # list of all prior actions (can query with helpers)
session.cost_usd          # total cost so far
session.daily_cost_usd    # cost in current 24h window
```

**`tool`** — Current tool metadata

```fpl
tool.reversibility        # "reversible", "partial", "irreversible"
tool.blast_radius         # "narrow", "broad", "organizational"
tool.tags                 # array of string tags
```

**`principal`** — Identity and permissions

```fpl
principal.id              # agent ID or user ID
principal.tier            # trust tier ("untrusted", "trusted", "verified")
principal.role            # role label (e.g., "finance_approver")
principal.org             # organization
principal.verified        # boolean: is identity cryptographically verified?
```

**`delegation`** — Current delegation chain

```fpl
delegation.depth          # chain depth (1 = root, 2 = one level deep)
delegation.origin_agent   # root agent in the chain
delegation.origin_org     # root org
delegation.agent_identity_verified  # boolean
```

**`time`** — Current time context

```fpl
time.hour                 # 0-23 UTC
time.weekday              # 1-7 (1=Monday, 7=Sunday)
time.month                # 1-12
time.day                  # 1-31
```

### Built-In Aliases

- `amount` → `args.amount` (defaults to 0 if missing)
- `cmd` → `args.cmd` (defaults to empty string)
- `host` → `args.host` (defaults to empty string)
- `path` → `args.path` (defaults to empty string)
- `tool_name` → current tool ID
- `recipients` → `args_array_len("recipients")`

### Built-In Helper Functions

**History Functions**:
```fpl
history_contains_within(tool_pattern, seconds)    # did tool match occur recently?
history_sequence(tool_a, tool_b, ...)             # have tools been called in order?
history_tool_count(tool_pattern)                  # how many times was tool called?
deny_count_within(seconds)                        # how many denials in last N seconds?
```

**Array Functions**:
```fpl
args_array_len(path)                              # length of args.path array
args_array_contains(path, value)                  # is value in args.path?
args_array_any_match(path, pattern)               # does any element match pattern?
contains(arr, s)                                  # string array membership
```

**Utility Functions**:
```fpl
purpose(expected)                                 # declare expected action purpose
```

### Expression Compilation Limits

Hard limits enforced at policy load time:
- Max expression characters: 1024
- Max function calls per expression: 32
- Max operator tokens: 96
- Max nesting depth: 16

Violations cause validation failures before any rule is evaluated.

## 14. FPL ↔ YAML Conversion

### FPL to YAML Bridge

```bash
faramesh policy fpl yaml policy.fpl
```

Produces:
```yaml
faramesh-version: "1.0"
agent-id: "my-agent"
default_effect: deny
fpl_inline: |
  agent my-agent {
    ...full FPL source...
  }
```

### Decompiling to Canonical FPL

```bash
faramesh policy decompile policy.yaml
faramesh policy decompile policy.fpl
```

- If YAML has `fpl_inline`, returns that directly (lossless)
- Otherwise reconstructs FPL from YAML fields (may be lossy for complex constructs)

Use `--strict-lossless` flag to fail on lossy conversions.

## 15. Validation and Compilation Workflow

```bash
# Syntax and structure validation
faramesh policy validate policy.fpl

# Machine-readable diagnostics
faramesh policy validate policy.fpl --json

# Parse/compile IR inspection
faramesh policy fpl --json policy.fpl

# Deterministic fixture suite
faramesh policy suite policy.fpl --fixtures tests/fixtures.yaml

# Counterfactual replay (test against historical data)
faramesh policy policy-replay --policy policy.fpl --wal /path/to/audit.wal
```

A policy is **not** production-ready until:
1. Syntax parses cleanly
2. All expressions compile to bytecode
3. Test suite passes
4. Historical replay shows expected decisions

## 16. Canonical Style Guide

Write FPL policies with explicit context:

```fpl
# ✓ Good: explicit roots
deny! shell/run when args.cmd != nil && args.cmd matches "rm -rf|mkfs"
permit stripe/refund when args.amount <= 500 && principal.verified == true
defer send_email when args_array_len("recipients") > 100

# ✗ Avoid: implicit bare symbols
deny! shell/run when cmd contains "rm -rf"     # unclear what `cmd` is
permit stripe/charge when user.tier == "vip"   # user doesn't exist; use principal
```

**Principles**:
- Use explicit runtime roots (`args.*`, `principal.*`, `delegation.*`)
- Guard nullable fields before comparisons
- Use helper functions for array checks
- Explain reasoning in `reason` clauses

## 17. Runtime Rejections and Debugging

Constructs that parse but fail at runtime:

- Multiple `agent` blocks
- Multiple `system` blocks
- Multiple `budget` blocks in one agent
- Unsupported delegate ceiling values (only `inherited` or `approval`)
- Invalid duration formats (e.g., `cache 5`)
- Phase references that don't exist

When validation fails:

```bash
faramesh policy validate policy.fpl --json
```

Returns detailed error with line numbers and suggestions.

## 18. Advanced: Embedded FPL in YAML

YAML policies can include FPL rules via:

```yaml
faramesh-version: "1.0"
agent-id: "hybrid-agent"
default_effect: deny

rules:
  - id: yaml-rule
    match:
      tool: "stripe/charge"
      when: "args.amount <= 500"
    effect: permit

fpl_inline: |
  deny! shell/* reason: "no shell"
  permit http/get

fpl_files:
  - "extra_rules.fpl"
  - "compliance/audit.fpl"
```

**Constraints**:
- Only flat rule and manifest snippets in embedded FPL
- Embedded `agent` and `system` blocks are rejected (fail-closed)

## 19. Production Checklist

Before deploying FPL policies:

- [ ] Policy validates cleanly: `faramesh policy validate policy.fpl`
- [ ] No unknown symbols in expressions
- [ ] Budget, phase, and delegate constraints are intentional
- [ ] Credential scope mappings are correct
- [ ] Test suite passes: `faramesh policy suite policy.fpl --fixtures tests/*.yaml`
- [ ] Historical replay shows expected decisions: `faramesh policy policy-replay --policy policy.fpl --wal audit.wal`
- [ ] Package within version control with commit history
- [ ] Deployed with read-only file permissions

## See Also

- [Policy Rules and Matching](/policies/rules-and-matching/)
- [Advanced Conditions](/policies/advanced-conditions/)
- [Policy YAML Schema](/reference/policy-schema/)
- [FPL Language Reference (faramesh-core)](https://github.com/faramesh/faramesh-core/blob/main/docs/fpl/LANGUAGE_REFERENCE.md)
