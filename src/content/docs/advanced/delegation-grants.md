---
title: Multi-Agent Delegation Grants
description: Authorize sub-agents to act on behalf of supervisor agents with bounded scope, chain depth, and revocation.
---

Delegation grants allow a supervisor agent to authorize one or more sub-agents to act on its behalf within a bounded scope, time window, and chain depth. Grants are cryptographically signed and persisted, enabling safe multi-level agent orchestration.

## Use Cases

- **Agent orchestration**: Supervisor agent delegates tool access to worker agents
- **Chain-of-thought patterns**: Multi-step reasoning agents delegate between stages
- **Approval workflows**: Approval agent delegates specific actions back to original agent
- **Multi-tenant isolation**: Separate agents per tenant, with supervisor controlling scope

## 1. Grant Model

### Grant Fields

| Field | Type | Description |
|---|---|---|
| `token` | string | Opaque identifier: `del_<base64payload>.<base64hmac>` |
| `from_agent` | string | Supervisor agent issuing the grant |
| `to_agent` | string | Sub-agent receiving the grant |
| `scope` | string | Tool pattern(s) sub-agent can use (glob) |
| `ceiling` | string | Optional ceiling (`inherited`, `approval`) |
| `issued_at` | timestamp | UTC issue time |
| `expires_at` | timestamp | UTC expiry; grants beyond this are rejected |
| `chain_depth` | int | Depth in delegation chain (1=root, 2=one level) |
| `active` | bool | Active status; false after revocation |

### Token Format

Tokens are self-describing and offline-verifiable:

```
del_<base64url(payload)>.<base64url(HMAC-SHA256(payload, key))>

Example:
del_eyJmcm9tX2FnZW50IjoicGF5bWVudC1zdXBlciIsIn...
._abcdef123456HMAC789signature...
```

**Properties**:
- **Tamper-proof**: Any byte change causes signature verification to fail
- **Offline-verifiable**: No database lookup needed to validate signature
- **Deterministic**: Same payload always produces same signature
- **Self-contained**: All grant info is in the token

## 2. Grant Lifecycle

### Issuance

Supervisor issues a grant to a sub-agent:

```bash
export FARAMESH_STANDING_ADMIN_TOKEN=secret123

faramesh delegate grant supervisor worker \
  --scope "stripe/*" \
  --ttl 2h

# Output:
# Token: del_eyJmcm9t...
# From: supervisor
# To: worker
# Scope: stripe/*
# Expires: 2026-05-11T14:23:45Z
```

**Validation during issuance**:

1. **Depth check**: Can't exceed maximum chain depth (default: 5)
   ```
   Root grant: depth 1
   -> delegate grant: depth 2
   -> -> delegate grant: depth 3 (etc, max 5)
   ```

2. **Scope subset**: Sub-agent's scope can't exceed supervisor's scope
   ```fpl
   # Supervisor grant has scope stripe/*
   # Worker can request: stripe/refund ✓
   # Worker can request: read_customer ✗ (not in supervisor's scope)
   ```

3. **TTL validation**: Must be positive duration
   ```
   Valid: 1m, 15m, 1h, 24h
   Invalid: -1m, 0s, "forever"
   ```

### Verification

When a sub-agent uses a delegated grant:

```bash
faramesh delegate verify del_eyJmcm9t...
```

**Checks performed** (fail-closed):

1. **Signature**: `Parse(token)` rejects tampered tokens before database hit
2. **Presence**: Token must exist in persistent store
3. **Active**: Grant must not have been revoked
4. **Expiry**: Current time must be before `expires_at`

**Response**:
```json
{
  "valid": true,
  "scope": "stripe/*",
  "chain_depth": 2,
  "expires_at": "2026-05-11T14:23:45Z"
}
```

### Revocation

Supervisor revokes delegated grants (idempotent):

```bash
faramesh delegate revoke supervisor worker

# Output:
# Revoked 3 active delegations from supervisor to worker
# Re-running returns: "no active delegations found"
```

**Effect**:
- All active grants from `supervisor` to `worker` are marked inactive
- Sub-agent can no longer use revoked grants
- Audit trail records revocation timestamp
- **One-way**: Revoking doesn't affect grants in opposite direction

### Chain Reconstruction

Walk the delegation chain from a leaf agent to root:

```bash
faramesh delegate chain worker

# Output (root-to-leaf):
# [0] supervisor (issued at 2026-05-11 12:00:00, depth=1)
# [1] -> worker (issued at 2026-05-11 13:00:00, depth=2)
```

**Properties**:
- Cycle detection via visited-set on `from_agent`
- Stops if any grant is revoked or expired
- Returns empty chain if no inbound grants exist

## 3. Chain Depth Enforcement

Limit how many levels of delegation are allowed:

### Default Behavior

```fpl
# Default max depth: 5
manifest grant supervisor1 to supervisor2 max 100
manifest grant supervisor2 to worker1 max 50
manifest grant worker1 to worker2 max 25     # depth 3 (OK)
manifest grant worker2 to processor max 10    # depth 4 (OK)
manifest grant processor to ... max ...       # depth 5 (OK)
# manifest grant ... to ...                   # depth 6 (DENIED)
```

### Configurable Depth

```bash
faramesh serve \
  --delegate-max-depth 3 \
  --policy policy.fpl
```

**Reasoning**: Prevents long chains that hide accountability and complicate auditing.

## 4. Scope Subset Enforcement

Sub-agents cannot escalate scope:

```fpl
# Policy defines supervisor's scope
agent supervisor {
  rules {
    permit stripe/refund when args.amount <= 5000
    permit stripe/charge when args.amount <= 10000
    deny stripe/*
  }
}
```

```bash
# Supervisor grants stripe/refund to worker (subset ✓)
faramesh delegate grant supervisor worker \
  --scope "stripe/refund" \
  --ttl 1h

# Worker tries to use stripe/charge (not in grant scope ✗)
# Denied: outside delegated scope
```

## 5. Delegation in Policy

### Manifest Declaration

Declare agent relationships in policy:

```fpl
manifest orchestrator payment-system

manifest grant payment-supervisor to payment-worker max 100
manifest grant payment-supervisor to approval-reviewer max 50 approval
manifest grant payment-worker to payment-processor max 25

# delegation_policies in compiled policy
```

### Delegation Ceiling

Apply constraints to delegated calls:

```fpl
delegate approval-worker {
  scope stripe/refund
  ttl 2h
  ceiling approval        # require prior approval
}

# Semantics:
# - approval-worker receives delegation token
# - Any call from approval-worker requires prior approval
# - Even if original policy would permit
```

### Delegation Expressions

Reference delegation context in policy:

```fpl
# Gate by delegation depth
deny stripe/* when delegation.depth > 3

# Gate by origin agent
deny * when delegation.origin_agent == "untrusted-agent"

# Verify origin identity
deny * when delegation.agent_identity_verified != true

# Gate by specific delegation
permit stripe/refund when delegation.depth == 2
```

## 6. Persistence and Storage

### Memory Store

For tests and ephemeral daemons (NOT production):

```bash
# Grants are lost on daemon restart
faramesh serve \
  --delegate-store memory \
  --policy policy.fpl
```

### SQLite Store (Production Default)

Durable, WAL-mode storage:

```bash
# Default path: ${data-dir}/delegations.db
faramesh serve \
  --data-dir /var/lib/faramesh \
  --policy policy.fpl

# Inspect store
sqlite3 /var/lib/faramesh/delegations.db "SELECT * FROM delegate_grants LIMIT 5;"
```

**Schema**:
```sql
CREATE TABLE delegate_grants (
  token           TEXT PRIMARY KEY,
  schema_version  TEXT NOT NULL DEFAULT 'delegate/1.0',
  from_agent      TEXT NOT NULL,
  to_agent        TEXT NOT NULL,
  scope           TEXT NOT NULL DEFAULT '*',
  ceiling         TEXT NOT NULL DEFAULT '',
  issued_at       INTEGER NOT NULL,     -- UTC unix seconds
  expires_at      INTEGER NOT NULL,     -- UTC unix seconds
  chain_depth     INTEGER NOT NULL DEFAULT 1,
  active          INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_delegate_grants_from ON delegate_grants(from_agent);
CREATE INDEX idx_delegate_grants_to ON delegate_grants(to_agent);
CREATE INDEX idx_delegate_grants_active_to ON delegate_grants(active, to_agent);
```

**Pragmas** (same as DPR store):
- `journal_mode=WAL` — Write-Ahead Logging
- `synchronous=NORMAL` — durability without fsync overhead
- `busy_timeout=5000` — wait 5s on lock contention
- `foreign_keys=ON` — enforce referential integrity

### Multi-Instance Deployments

Delegations must be visible to all daemon instances:

**Option 1**: Shared SQLite database

```bash
# Both daemons point to same DB file (requires NFS or shared storage)
faramesh serve \
  --delegate-store sqlite \
  --data-dir /shared/faramesh/data \
  --policy policy.fpl
```

**Option 2**: PostgreSQL backend (future)

```bash
# Not yet implemented, but architecture supports it
# faramesh serve --delegate-dsn postgres://...
```

## 7. CLI Operations

### Grant

```bash
faramesh delegate grant <from-agent> <to-agent> \
  --scope "pattern" \
  --ttl <duration> \
  [--ceiling inherited|approval] \
  [--admin-token secret]
```

### Inspect

```bash
faramesh delegate inspect del_<token>

# Shows:
# Token: del_<...>
# From: supervisor
# To: worker
# Scope: stripe/*
# Expires: 2026-05-11T14:23:45Z
# Active: true
```

### Verify

```bash
faramesh delegate verify del_<token>

# Shows signature validation result + current status
```

### List

```bash
faramesh delegate list worker

# Shows all delegations involving agent "worker"
# (both received and granted)
```

### Chain

```bash
faramesh delegate chain worker

# Shows delegation chain from root to this agent
```

### Revoke

```bash
faramesh delegate revoke supervisor worker

# Revokes ALL active grants from supervisor to worker
```

## 8. Audit and Compliance

All delegation operations are recorded:

```bash
faramesh audit tail | grep delegate

# Output:
# 2026-05-11 12:00:00 GRANT supervisor:worker stripe/* 2h
# 2026-05-11 13:45:22 VERIFY del_abc... OK
# 2026-05-11 14:30:15 REVOKE supervisor:worker
```

**Audit fields**:
- Timestamp
- Operation (GRANT, VERIFY, REVOKE, CHAIN)
- Agent IDs
- Scope
- TTL
- Result (OK, DENIED, EXPIRED)

## 9. Troubleshooting

### Grant Denied with "chain_depth_exceeded"

**Root Cause**: Sub-agent is too many levels deep

**Fix**:
```bash
# Check depth
faramesh delegate chain worker

# Option 1: Increase max depth
faramesh serve --delegate-max-depth 10 --policy policy.fpl

# Option 2: Simplify chain (don't delegate to worker; grant directly to processor)
faramesh delegate grant supervisor processor --scope "pattern" --ttl 1h
```

### Grant Denied with "scope_subset"

**Root Cause**: Sub-agent's requested scope exceeds supervisor's granted scope

**Example**:
```bash
# Supervisor has scope "stripe/refund"
# Trying to grant "stripe/charge" to worker
faramesh delegate grant supervisor worker --scope "stripe/charge"
# Error: scope "stripe/charge" not in supervisor's scope
```

**Fix**:
```bash
# Grant only what supervisor can grant
faramesh delegate grant supervisor worker --scope "stripe/refund" --ttl 1h
```

### Verify Shows "token_not_found"

**Symptoms**: Token was issued but verify fails

**Root Cause**: Token never persisted or database was wiped

**Check**:
```bash
sqlite3 /var/lib/faramesh/delegations.db \
  "SELECT count(*) FROM delegate_grants;"
```

### Token Expired

**Symptoms**: `faramesh delegate verify` returns false

**Root Cause**: `expires_at` timestamp is in the past

**Fix**:
```bash
# Issue new grant with longer TTL
faramesh delegate grant supervisor worker --scope "stripe/*" --ttl 24h
```

## 10. Production Checklist

- [ ] Delegation database is backed up with DPR/WAL files
- [ ] Max chain depth is configured appropriately for your org
- [ ] Revocation is tested and works
- [ ] Audit trail is logged and monitored
- [ ] Sub-agents cannot escalate scope (test this)
- [ ] Grant tokens are stored securely (treat like credentials)
- [ ] Multi-instance deployments share the delegation store
- [ ] Delegation policies are declared in FPL

## See Also

- [Multi-Agent Orchestration](/architecture/multi-agent-orchestration/)
- [FPL Language: Delegation and Manifest](/policies/fpl-language/#7-delegate-block-sub-agent-permissions)
- [SPIFFE Workload Identity](/identity/spiffe-workload-identity/)
- [Faramesh Core Delegation Docs](https://github.com/faramesh/faramesh-core/blob/main/docs/guides/DELEGATION_GRANTS.md)
