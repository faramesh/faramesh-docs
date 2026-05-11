---
title: Supply Chain Verification
description: Ed25519 DPR signatures for cryptographic record integrity and audit compliance.
---

Supply chain verification ensures audit records cannot be tampered with after the fact. Faramesh uses Ed25519 digital signatures to cryptographically commit every approval and denial decision. This prevents evidence tampering in compliance audits and enables chain-of-custody verification across organizational boundaries.

## Why Supply Chain Verification

Without signatures, an attacker could:

```
Original audit record:
  action: denied
  reason: security_risk

After tampering (no signatures):
  action: permitted
  reason: compliance_approved
  # No way to detect the change
```

With Ed25519 signatures:

```
Original audit record:
  action: denied
  reason: security_risk
  signature: <Ed25519 signature>

After tampering:
  action: permitted                 ← Changed
  signature: <old Ed25519 signature> ← Still matches original bytes
  # Signature verification fails immediately
```

## 1. How Ed25519 Signatures Work

### Key Generation

Faramesh generates Ed25519 keypair at startup:

```bash
# Generated automatically on first run
faramesh serve --data-dir /var/lib/faramesh --policy policy.fpl

# Files created:
# /var/lib/faramesh/faramesh.ed25519.key   (private, mode 0600)
# /var/lib/faramesh/faramesh.ed25519.pub   (public)
# /var/lib/faramesh/faramesh.ed25519.meta.json  (metadata)
```

**Key properties**:
- **Private key**: 32-byte seed (stored securely, never transmitted)
- **Public key**: 32-byte public point (safe to distribute)
- **Metadata**: Key ID, creation timestamp, rotation schedule

### Signature Process

For each approval/denial decision:

```
1. Serialize action record:
   {
     "action_id": "act_123",
     "tool": "stripe/refund",
     "effect": "deny",
     "reason": "amount exceeds budget",
     "timestamp": 1715403825
   }

2. Hash record:
   hash = SHA-512(canonical_json(record))

3. Sign hash:
   signature = Ed25519_Sign(private_key, hash)

4. Store record + signature:
   action_record.signature = base64(signature)
```

### Verification

To verify a record hasn't been tampered with:

```bash
faramesh audit show act_123

# Output:
# Action ID: act_123
# Tool: stripe/refund
# Effect: deny
# Signature Valid: ✓ (matches public key)
# Record Hash Valid: ✓ (no bytes modified)
```

**Verification steps**:
1. Deserialize record from audit store
2. Compute hash of record bytes
3. Verify Ed25519 signature against public key
4. If both checks pass, record is authentic

## 2. Key Management

### Key Files

Three files comprise the key material:

```bash
/var/lib/faramesh/
├── faramesh.ed25519.key      # Private key (32 bytes, mode 0600)
├── faramesh.ed25519.pub      # Public key (32 bytes, readable)
└── faramesh.ed25519.meta.json # Metadata (JSON)
```

**Metadata format**:

```json
{
  "key_id": "dpr_key_v1_2026_may",
  "algorithm": "ed25519",
  "created_at": "2026-05-11T12:00:00Z",
  "rotation_schedule": "annual",
  "revocation_status": "active"
}
```

### Protecting the Private Key

The private key is your signing authority:

```bash
# Permissions must be restrictive
ls -la /var/lib/faramesh/faramesh.ed25519.key
# -rw------- (0600) owner only

# Backup with full encryption
tar czf backup.tar.gz \
  --encrypt \
  /var/lib/faramesh/faramesh.ed25519.key \
  /var/lib/faramesh/faramesh.ed25519.meta.json

# Never commit to version control
echo "faramesh.ed25519.key" >> .gitignore
```

### Exporting Public Key

Share the public key for verification:

```bash
faramesh key export dpr

# Output:
# -----BEGIN PUBLIC KEY-----
# MCowBQYDK2VwAyEA<base64_public_key_32_bytes>
# -----END PUBLIC KEY-----
```

**With metadata**:

```bash
faramesh key export dpr --verbose

# Output:
# Key ID: dpr_key_v1_2026_may
# Algorithm: ed25519
# Created: 2026-05-11T12:00:00Z
# Public: MCowBQYDK2VwAyEA...
```

Use this for:
- Multi-instance verification (all daemons share same public key)
- Third-party audit verification
- Compliance documentation

## 3. Key Rotation

### Planned Rotation

Rotate keys periodically (annually is default):

```bash
faramesh key rotate dpr --new-schedule monthly

# Output:
# Old key marked for deprecation at: 2026-06-11T00:00:00Z
# New keypair generated
# Old public key saved for historical verification
```

**Deprecation schedule**:

```json
{
  "active_key": "dpr_key_v2_2026_june",
  "deprecated_keys": [
    {
      "key_id": "dpr_key_v1_2026_may",
      "active_until": "2026-06-11T00:00:00Z"
    }
  ]
}
```

### Emergency Rotation

If private key is compromised:

```bash
faramesh key rotate dpr --force --emergency

# Actions taken:
# 1. Mark old key as REVOKED
# 2. Generate new keypair
# 3. Save old public key for historical audit
# 4. Alert all instances via config update
```

**Impact**:
- All future records signed with new key
- Historical records remain valid with old key
- Audit trail remains unbroken

### Backfilling Historical Records

When rotating keys, backfill unsigned historical records:

```bash
# Dry-run: show what would be re-signed
faramesh compliance resign --data-dir /var/lib/faramesh

# Output:
# Would re-sign 847 records
# Starting from: 2026-05-11T10:00:00Z
```

**Applying re-sign**:

```bash
faramesh compliance resign --data-dir /var/lib/faramesh --apply

# Output:
# Re-signed 847 records
# Verified chain integrity: OK
# Backfill complete
```

**With scoping**:

```bash
# Re-sign only missing signatures (don't re-sign existing)
faramesh compliance resign \
  --data-dir /var/lib/faramesh \
  --only-missing \
  --apply

# Re-sign with limit (batch operation)
faramesh compliance resign \
  --data-dir /var/lib/faramesh \
  --limit 5000 \
  --apply
```

## 4. Audit Verification

### Check Record Signature

Verify a single record hasn't been tampered with:

```bash
faramesh audit show act_abc123

# Output:
# Action ID: act_abc123
# Tool: stripe/refund
# Args: { amount: 3000 }
# Effect: deny
# Reason: exceeds daily budget
# Timestamp: 2026-05-11T14:23:00Z
#
# Cryptographic Status:
#   record_hash_valid: ✓
#   signature_valid: ✓
#   signed_with: dpr_key_v1_2026_may
#   verified_at: 2026-05-11T14:23:15Z
```

### Verify WAL Chain

Audit log uses Write-Ahead Logging (WAL) for durability. Verify the chain:

```bash
faramesh audit verify

# Output:
# WAL frames: 1247
# Chain integrity: ✓
# All signatures valid: ✓
# Tamper detection: NONE
```

**What it checks**:
1. WAL frame sequence numbers are contiguous
2. Each frame header is structurally valid
3. Each action record has valid signature
4. Signature matches current public key or deprecated keys
5. No gaps or out-of-order frames

### Incremental Verification

For large audit logs, verify incrementally:

```bash
# Verify last 100 records only
faramesh audit verify --recent 100

# Verify records from specific timestamp
faramesh audit verify --since 2026-05-11T10:00:00Z

# Verify specific action ID range
faramesh audit verify --from act_1000 --to act_2000
```

### WAL Inspection

Inspect WAL frame details:

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
#
# Migration recommendation: Update 47 v1 frames to v2 format
```

## 5. Multi-Instance Deployments

When running multiple Faramesh daemons, ensure consistent signatures:

### Shared Public Key

All instances must verify against the same public key:

```bash
# Instance 1: Generate and export key
faramesh key export dpr > /shared/dpr.pub

# Instance 2-N: Load shared key
faramesh serve \
  --data-dir /var/lib/faramesh \
  --dpr-public-key /shared/dpr.pub \
  --policy policy.fpl
```

### Shared Approval Envelope Key

For approval workflows (HMAC compatibility), use shared secret:

```bash
# Generate HMAC key
faramesh key generate hmac > /secure/hmac.key

# All instances use same HMAC key
faramesh serve \
  --data-dir /var/lib/faramesh \
  --dpr-hmac-key /secure/hmac.key \
  --policy policy.fpl
```

**HMAC key properties**:
- Used for approval envelope integrity (backward compatibility)
- Does not replace Ed25519 for DPR records
- Should be rotated separately from Ed25519 keys

## 6. Compliance and Audits

### Export Audit Log for Compliance

Extract audit log in compliance format:

```bash
# Export as JSON (with signatures)
faramesh audit export --format json > audit-trail.json

# Export as CSV (for spreadsheet analysis)
faramesh audit export --format csv > audit-trail.csv

# Export with public key for external verification
faramesh audit export --with-public-key > audit-package.tar.gz
```

**Exported format includes**:
- Each action record (tool, effect, reason, timestamp)
- Base64-encoded Ed25519 signature
- Public key used to sign
- Key rotation metadata

### Verify Exported Log

Third parties can verify exported logs:

```bash
# Recipient has: audit-package.tar.gz (records + public key)

# Extract
tar xzf audit-package.tar.gz

# Verify all signatures
openssl dgst -sha512 -verify dpr.pub \
  -signature audit-trail.sig audit-trail.json

# Or use Faramesh tools
faramesh audit verify --from-export audit-package.tar.gz
```

### Compliance Checklist

Track compliance requirements:

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

## 7. Troubleshooting

### Signature Verification Fails

**Error**: `signature_valid: ✗`

**Causes**:
1. Record was modified after signing
2. Wrong public key used to verify
3. Key rotation happened but old key not in deprecated set

**Fix**:
```bash
# Check which key was used for signature
faramesh audit show act_abc123 --verbose

# If old key: ensure it's in deprecated set
faramesh key list --all

# If record modified: restore from backup
cp /backup/faramesh-audit.db /var/lib/faramesh/
```

### Tamper Detection

**Error**: `WAL chain integrity: ✗`

**Root cause**: Audit log was corrupted or tampered with

**Response**:
```bash
# Stop the daemon immediately
systemctl stop faramesh

# Alert security team
# Restore from backup
cp /backup/faramesh-audit.db /var/lib/faramesh/

# Verify restored log
faramesh audit verify

# Restart
systemctl start faramesh

# Investigate: what modified the WAL?
```

### Key Rotation Stuck

**Error**: `rotate dpr` hangs or fails

**Check**:
```bash
# See what's holding locks
lsof | grep faramesh.ed25519

# Force-kill process safely
systemctl stop faramesh

# Clean up lock files
rm -f /var/lib/faramesh/*.lock

# Restart and retry
systemctl start faramesh
faramesh key rotate dpr --apply
```

## 8. Integration with External Systems

### Export for Compliance Platform

Send audit logs to external compliance system:

```bash
# Automated export
faramesh audit export \
  --since 2026-05-11T00:00:00Z \
  --until 2026-05-12T00:00:00Z \
  --format json | \
  curl -X POST \
    -H "Content-Type: application/json" \
    -d @- \
    https://compliance-platform.internal/api/audit/import
```

### Blockchain/Ledger Integration

For immutable ledger systems:

```bash
# Export public key + audit hash
AUDIT_HASH=$(faramesh audit export --format json | sha256sum)
PUBLIC_KEY=$(faramesh key export dpr)

# Submit to ledger
submit-to-ledger \
  --audit-hash "$AUDIT_HASH" \
  --public-key "$PUBLIC_KEY" \
  --timestamp $(date -u +%s)
```

## 9. Production Checklist

- [ ] Ed25519 private key backed up securely (encrypted)
- [ ] Public key exported and documented
- [ ] Key rotation schedule is active (annual or custom)
- [ ] All audit records have valid signatures (`faramesh audit verify`)
- [ ] WAL integrity checked (`faramesh audit verify`)
- [ ] Multi-instance deployments use shared public key
- [ ] HMAC key is backed up separately
- [ ] Compliance export tested and working
- [ ] Tamper detection alerting is configured

## See Also

- [Audit and Compliance](/governance/audit-and-compliance/)
- [Delegation Grants](/advanced/delegation-grants/)
- [Policy Approval Workflows](/guides/approval-workflows/)
- [Faramesh Core DPR Documentation](https://github.com/faramesh/faramesh-core/blob/main/docs/guides/DPR_HMAC_KEY.md)
