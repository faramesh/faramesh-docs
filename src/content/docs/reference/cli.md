---
title: CLI Reference
description: Complete reference for faramesh command-line interface including policy, audit, delegation, and daemon management.
---

The Faramesh CLI provides tools for policy management, daemon control, audit inspection, identity verification, and pack/runtime lifecycle management.

## Verified Command Tree

This command tree is sourced from the Cobra `Use:` declarations in `faramesh-core/cmd/faramesh/*.go`.

### Top-level commands

- `discover`
- `attach`
- `coverage`
- `gaps`
- `suggest`
- `run`
- `serve`
- `stop`
- `setup`
- `policy`
- `audit`
- `approvals`
- `explain`
- `delegate`
- `identity`
- `credential`
- `auth`
- `session`
- `pack`
- `fleet`
- `schedule`
- `ops`
- `provenance`
- `onboard`
- `verify`
- `detect`
- `sbom`
- `model`
- `compliance`
- `wizard`
- `offboard`
- `policy-replay`
- `status`
- `compensate`

### Selected subcommands

- `setup flow`, `setup uninstall`, `setup update`, `setup upgrade`
- `policy validate`, `policy inspect`, `policy test`, `policy diff`, `policy reload`
- `audit tail`, `audit verify`, `audit compact`, `audit wal-inspect`
- `approvals list`, `approvals pending`, `approvals show`, `approvals watch`, `approvals history`, `approvals approve`, `approvals deny`, `approvals ui`
- `delegate grant`, `delegate list`, `delegate revoke`, `delegate inspect`, `delegate verify`, `delegate chain`
- `identity status`, `identity verify`, `identity trust`, `identity whoami`, `identity attest`, `identity federation`, `identity trust-level`
- `credential status`, `credential audit`, `credential vault up`, `credential vault status`, `credential vault down`, `credential vault put`
- `session open`, `session close`, `session list`, `session budget`, `session reset`, `session inspect`, `session purpose`, `session declare`
- `pack upgrade`, `pack status`
- `fleet push`, `fleet kill`, `fleet list`
- `schedule create`, `schedule list`, `schedule inspect`, `schedule cancel`, `schedule approve`, `schedule pending`, `schedule history`
- `ops policy-change`, `ops audit`, `ops login`, `ops logout`, `ops whoami`
- `provenance sign`, `provenance verify`, `provenance inspect`, `provenance diff`, `provenance list`
- `verify digest`, `verify manifest`, `verify manifest-generate`, `verify buildinfo`, `verify signature`
- `model register`, `model verify`, `model consistency`, `model list`, `model alert`
- `compliance export`, `compliance resign`, `compliance verify-report`

All commands support JSON output where implemented, but individual subcommands have their own flag sets and exit codes.

## Policy Commands

### Policy Validate

Validate a policy file (FPL or YAML):

```bash
faramesh policy validate policies/payment.fpl

# Output:
# ✓ policies/payment.fpl  [v1.0]  12 rules  agent=payment-processor
```

**With JSON diagnostics**:

```bash
faramesh policy validate policies/payment.fpl --json

# Output:
# {
#   "path": "policies/payment.fpl",
#   "format": "fpl",
#   "agent_id": "payment-processor",
#   "rule_count": 12,
#   "warnings": [],
#   "errors": [],
#   "ok": true
# }
```

**Exit codes**:
- `0` — Valid policy
- `1` — Validation failed

### Policy Inspect

Show compiled policy summary:

```bash
faramesh policy inspect policies/payment.fpl

# Output:
# Policy: policies/payment.fpl
#   version    : v1.0
#   agent-id   : payment-processor
#   fpl        : 1.0
#   rules      : 12
#   tools      : 3 declared
#   default    : deny

# Rules:
#   permit   rule-stripe-charge-500     tool=stripe/charge when="args.amount <= 500"
#   permit   rule-stripe-refund-100     tool=stripe/refund when="args.amount <= 100"
#   defer    rule-large-refund          tool=stripe/refund when="args.amount > 100"
```

### Policy Test

Dry-run a tool call against a policy:

```bash
faramesh policy test policies/payment.fpl \
  --tool stripe/refund \
  --args '{"amount":500}'

# Output:
#   Tool:     stripe/refund
#   Effect:   permit
#   Reason:   rule-stripe-refund-100
```

**With full JSON decision**:

```bash
faramesh policy test policies/payment.fpl \
  --tool stripe/refund \
  --args '{"amount":500}' \
  --json

# Output:
# {
#   "call_id": "policy-test",
#   "effect": "permit",
#   "reason": "rule-stripe-refund-100",
#   "tool_id": "stripe/refund",
#   "args": {"amount": 500},
#   "timestamp": "2026-05-11T14:23:00Z"
# }
```

### Policy Diff

Compare two policy versions:

```bash
faramesh policy diff policies/v1.fpl policies/v2.fpl

# Output:
# Rules added:
#   + rule-new-payment-method    permit payment/card
#
# Rules removed:
#   - rule-old-deprecated        deny shell/*
#
# Rules modified:
#   ~ rule-stripe-charge        (ceiling changed: approval -> none)
```

### Policy Reload

Hot-reload the running daemon's policy:

```bash
faramesh policy reload

# Output:
# Sent SIGHUP to daemon (PID 12345)
# Policy reloaded successfully
```

**Custom data directory**:

```bash
faramesh policy reload --data-dir /var/lib/faramesh
```

**Behavior**:
- In-flight evaluations complete with old policy
- New evaluations use reloaded policy
- No daemon restart required
- Changes are atomic

## Daemon Commands

### Serve

Start the Faramesh daemon:

```bash
faramesh serve \
  --policy policies/production.fpl \
  --data-dir /var/lib/faramesh \
  --listen-addr 0.0.0.0:5432 \
  --log-level info
```

**Common flags**:

| Flag | Description | Default |
|------|-------------|---------|
| `--policy` | Policy file path | required |
| `--data-dir` | Data directory for audit/WAL/DB | `$TMPDIR/faramesh` |
| `--listen-addr` | Listen address for SDK | `127.0.0.1:5432` |
| `--log-level` | Log verbosity: debug, info, warn, error | info |
| `--dpr-hmac-key` | HMAC key for approvals (or env var) | auto-generate |

**Advanced flags**:

```bash
faramesh serve \
  --policy policy.fpl \
  --spiffe-socket unix:///run/spire/sockets/agent.sock \
  --trust-domain example.org \
  --delegate-max-depth 5 \
  --delegate-store sqlite \
  --mcp-proxy-port 19092 \
  --mcp-target http://127.0.0.1:8080 \
  --mcp-edge-auth-mode bearer \
  --mcp-edge-auth-bearer-token "$AUTH_TOKEN"
```

## Audit Commands

### Audit Tail

Stream audit log entries:

```bash
faramesh audit tail

# Output:
# 2026-05-11T14:23:00Z  decision      stripe/charge  permit   args.amount=500
# 2026-05-11T14:23:15Z  approval      stripe/refund  deferred finance@example.com
# 2026-05-11T14:23:30Z  decision      shell/run      deny     unauthorized
```

**With filtering**:

```bash
# Filter by effect
faramesh audit tail --filter "effect:deny"

# Filter by tool
faramesh audit tail --filter "tool:stripe/*"

# Filter by timestamp
faramesh audit tail --since 2026-05-11T12:00:00Z --until 2026-05-11T14:00:00Z
```

### Audit Show

Display a single audit record:

```bash
faramesh audit show act_abc123

# Output:
# Action ID: act_abc123
# Tool: stripe/refund
# Args: { amount: 3000 }
# Effect: denied
# Reason: exceeds daily budget
# Principal: agent-payment-processor
# Timestamp: 2026-05-11T14:23:00Z
#
# Cryptographic Status:
#   record_hash_valid: ✓
#   signature_valid: ✓
```

### Audit Verify

Verify audit log integrity:

```bash
faramesh audit verify

# Output:
# WAL frames: 1247
# Chain integrity: ✓
# All signatures valid: ✓
# Tamper detection: NONE
```

**Incremental verification**:

```bash
# Last 100 records only
faramesh audit verify --recent 100

# Records from timestamp
faramesh audit verify --since 2026-05-11T10:00:00Z

# Specific action range
faramesh audit verify --from act_1000 --to act_2000
```

### Audit Export

Export audit log:

```bash
# JSON format
faramesh audit export --format json > audit-trail.json

# CSV format
faramesh audit export --format csv > audit-trail.csv

# With public key
faramesh audit export --with-public-key > audit-package.tar.gz
```

### Audit WAL Inspect

Inspect Write-Ahead Log details:

```bash
faramesh audit wal-inspect

# Output:
# Total frames: 1247
# Frame size distribution:
#   64 bytes:   10 (headers)
#   256 bytes:  500 (small records)
#   512 bytes:  400 (medium records)
#   1024 bytes: 337 (large records)
#
# Version distribution:
#   WAL v1: 1200 frames
#   WAL v2: 47 frames
```

## Delegation Commands

### Delegate Grant

Issue a delegation grant:

```bash
faramesh delegate grant supervisor worker \
  --scope "stripe/*" \
  --ttl 2h

# Output:
# Token: del_eyJmcm9tX2FnZW50Ijoi...
# From: supervisor
# To: worker
# Scope: stripe/*
# Expires: 2026-05-11T16:23:45Z
```

### Delegate Verify

Verify a delegation token:

```bash
faramesh delegate verify del_eyJmcm9t...

# Output:
# Token Valid: ✓
# Scope: stripe/*
# Chain Depth: 2
# Expires: 2026-05-11T16:23:45Z
```

### Delegate Inspect

Show token details:

```bash
faramesh delegate inspect del_eyJmcm9t...

# Output:
# Token: del_eyJmcm9t...
# From: supervisor
# To: worker
# Scope: stripe/*
# Issued: 2026-05-11T14:23:45Z
# Expires: 2026-05-11T16:23:45Z
# Active: true
```

### Delegate List

List delegations:

```bash
faramesh delegate list worker

# Output:
# Delegations involving worker:
# [0] supervisor → worker  stripe/*  (active, expires 2h)
# [1] worker → processor   stripe/refund  (active, expires 1h)
```

### Delegate Chain

Show delegation chain:

```bash
faramesh delegate chain processor

# Output (root-to-leaf):
# [0] supervisor (issued 2026-05-11 12:00:00, depth=1)
# [1] → worker (issued 2026-05-11 13:00:00, depth=2)
# [2] → processor (issued 2026-05-11 14:00:00, depth=3)
```

### Delegate Revoke

Revoke delegations:

```bash
faramesh delegate revoke supervisor worker

# Output:
# Revoked 3 active delegations from supervisor to worker
```

## Key Commands

### Key Export

Export cryptographic keys:

```bash
# Export DPR public key
faramesh key export dpr

# With metadata
faramesh key export dpr --verbose

# Output:
# Key ID: dpr_key_v1_2026_may
# Algorithm: ed25519
# Created: 2026-05-11T12:00:00Z
# Public: MCowBQYDK2VwAyEA...
```

### Key Rotate

Rotate keys:

```bash
# Planned rotation
faramesh key rotate dpr --new-schedule monthly

# Emergency rotation
faramesh key rotate dpr --force --emergency
```

### Key List

List key material:

```bash
faramesh key list --all

# Output:
# Active keys:
#   dpr_key_v2_2026_june (ed25519)
#
# Deprecated keys:
#   dpr_key_v1_2026_may (active until 2026-06-11T00:00:00Z)
```

## Identity Commands

### Identity Status

Check current workload identity:

```bash
faramesh identity status

# Output:
# SPIFFE ID: spiffe://example.org/agent/payment-processor
# Verified: true
# Trust Domain: example.org
# SVID Expires: 2026-05-11T15:23:45Z
```

### Identity Trust

Manage trust bundles:

```bash
# Show all trust bundles
faramesh identity trust --show-bundles

# Add external org trust bundle
faramesh identity trust \
  --domain partner-org.internal \
  --bundle /path/to/bundle.pem

# Verify cross-org identity
faramesh identity verify \
  --spiffe spiffe://partner-org.internal/agent/partner-agent \
  --bundle /path/to/bundle.pem
```

## Compliance Commands

### Compliance Resign

Backfill Ed25519 signatures:

```bash
# Dry-run
faramesh compliance resign --data-dir ~/.faramesh/runtime/data

# Apply
faramesh compliance resign --data-dir ~/.faramesh/runtime/data --apply

# Batch with limit
faramesh compliance resign \
  --data-dir ~/.faramesh/runtime/data \
  --limit 5000 \
  --only-missing \
  --apply
```

### Compliance Check

Verify compliance status:

```bash
faramesh compliance check

# Output:
# ✓ Ed25519 key exists and protected (0600)
# ✓ All records have valid signatures (1247/1247)
# ✓ No deprecated key usage in last 30 days
# ✓ WAL backup completed: 2h ago
# ✓ Public key exported for audit: 2026-05-11
# ✓ Key rotation schedule active (annual)
# ✓ HMAC key rotation due in: 45 days
```

## Metrics Commands

### Metrics Export

Export metrics:

```bash
# Prometheus format
faramesh metrics export --format prometheus

# JSON format
faramesh metrics export --format json

# CloudWatch (send to AWS)
faramesh metrics export --format json | \
  aws cloudwatch put-metric-data --namespace Faramesh --metric-data file:///dev/stdin
```

## Global Flags

All commands support:

```bash
faramesh [command] \
  --help                   # Show help
  --version                # Show version
  --verbose                # Verbose output
  --config /path/config    # Config file (YAML)
```

## Environment Variables

Key environment variables:

```bash
# Policy and data
FARAMESH_POLICY=/etc/faramesh/policy.fpl
FARAMESH_DATA_DIR=/var/lib/faramesh

# Identity and credentials
FARAMESH_SPIFFE_ID=spiffe://example.org/agent/my-agent
SPIRE_SOCKET=unix:///run/spire/sockets/agent.sock
FARAMESH_TRUST_DOMAIN=example.org

# Security
FARAMESH_DPR_HMAC_KEY=secret123
FARAMESH_MCP_EDGE_AUTH_BEARER_TOKEN=sk_test_abc123xyz

# Logging
FARAMESH_LOG_LEVEL=info

# Delegation
FARAMESH_DELEGATE_MAX_DEPTH=5
FARAMESH_STANDING_ADMIN_TOKEN=admin_secret
```

## Common Workflows

### Policy Development

```bash
# 1. Edit policy
vim policies/payment.fpl

# 2. Validate
faramesh policy validate policies/payment.fpl

# 3. Test against scenarios
faramesh policy test policies/payment.fpl --tool stripe/charge --args '{"amount":500}'
faramesh policy test policies/payment.fpl --tool stripe/charge --args '{"amount":5001}'

# 4. Compare with existing
faramesh policy diff policies/current.fpl policies/payment.fpl

# 5. Reload running daemon
faramesh policy reload
```

### Troubleshooting

```bash
# Check daemon is running
ps aux | grep "faramesh serve"

# View recent decisions
faramesh audit tail --recent 20

# Find all denials
faramesh audit tail --filter "effect:deny"

# Inspect specific decision
faramesh audit show act_abc123

# Verify audit integrity
faramesh audit verify

# Check identity
faramesh identity status

# Export full audit trail
faramesh audit export --format json > full-audit.json
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Command failed / policy invalid |
| 2 | Usage error |
| 124 | Command timeout |
| 126 | Command not executable |
| 127 | Command not found |
| 255 | Unknown error |

## See Also

- [Policy Validation](/policies/overview/)
- [Audit and Compliance](/governance/audit-and-compliance/)
- [FPL Language](/policies/fpl-language/)
- [SPIFFE Workload Identity](/identity/spiffe-workload-identity/)
- [Environment Variables](/reference/environment-variables/)

See [Installation](/getting-started/installation/) and [Policy Engine](/concepts/policy-engine/).
