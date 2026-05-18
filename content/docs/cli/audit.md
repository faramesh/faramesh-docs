---
title: faramesh audit
description: Inspect, verify, and export the Decision Provenance Record chain. The hash-chained, optionally KMS-signed source of truth for what your agent did.
---

`faramesh audit` is the read side of the WAL. Every governance decision the daemon makes — permit, defer, deny, plus credential issuance, redactions, and rule references — is written as a **Decision Provenance Record (DPR)** into a hash-chained log. The `audit` subcommands let you tail it, inspect individual records, verify the chain, and export windows for SIEMs and auditors.

If you can't trust this command, you can't trust the audit story. Treat its output as evidence.

## Usage

```bash title="Terminal"
faramesh audit tail     [--agent ID] [--effect permit|defer|deny] [--limit N] [--format text|json]
faramesh audit show     <dpr-id>
faramesh audit verify   [--dir DIR] [--from TIMESTAMP] [--to TIMESTAMP]
faramesh audit ls       [--tool TOOL] [--since DURATION]
faramesh audit export   [--from TIMESTAMP] [--to TIMESTAMP] [--format json|csv|jsonl]
faramesh audit stats    [--since DURATION]
faramesh audit trace    <correlation-id>
faramesh audit compact
faramesh audit wal inspect
```

All subcommands operate on the local stack's WAL (`runtime { wal_dir }`). They do not require the daemon to be running, except `tail` (which streams live).

## Subcommands

### `tail` — stream the live decision log

```bash title="Terminal"
$ faramesh audit tail --effect deny

[2026-05-17T19:30:01Z] dpr-7f3b  support-bot  stripe/refund   DENY   amount $8000 ≥ $5000 ceiling
[2026-05-17T19:30:14Z] dpr-7f3c  support-bot  send_email      DENY   external recipient
```

Filters: `--agent`, `--effect`, `--tool`. Combine freely. `--format json` emits one DPR per line for piping to `jq`.

### `show` — full DPR for one decision

```bash title="Terminal"
$ faramesh audit show dpr-7f3b

DPR
  id:           dpr-7f3b
  timestamp:    2026-05-17T19:30:01Z
  agent_id:     support-bot
  agent_ident:  spiffe://corp.example.com/support-bot/abc
  tool:         stripe/refund
  args:
    amount: 8000
    card_number: [REDACTED]
  effect:       DENY
  rule_ref:     governance.fms:18
  reason_code:  POLICY_DENY
  reason:       refunds over $500 require platform team
  pipeline:
    - identity verified (SPIFFE)
    - rule#3 matched
    - rule conditions: amount >= 500 → true
  credential:   not minted (denied before broker)
  prev_hash:    aa42…
  this_hash:    f8c1…
  signature:    ed25519: 7b3e…  (KMS-signed)
```

The `show` output is the full structured record. You read this when an auditor asks "what exactly happened on May 17 at 19:30:01."

### `ls` — paginate decisions

```bash title="Terminal"
$ faramesh audit ls --tool stripe/refund --since 24h
TIMESTAMP             DPR        EFFECT  AMOUNT  REASON
2026-05-17T18:14Z     dpr-7f1a   PERMIT  $80     —
2026-05-17T19:30Z     dpr-7f3b   DENY    $8000   policy ceiling
```

For richer queries, export and use `jq` or your SIEM.

### `verify` — check the chain end to end

```bash title="Terminal"
$ faramesh audit verify

Verifying WAL at ./faramesh-wal ...
✓ 14,329 records
✓ hash chain intact (no gaps, no rewrites)
✓ KMS signatures valid (1,432 signed records)
✓ no dev-mode tags in production policy mode
audit chain verified
```

What `verify` checks:

- **Hash chain.** Every DPR's `prev_hash` matches the previous record's hash.
- **Signatures.** If KMS signing is enabled, every signed DPR is verified against the registered public key.
- **Mode tags.** A production stack with dev-mode tagged DPRs is flagged (you accidentally ran dev once).
- **Provider attestations.** Provider binaries that signed audit batches are still trusted (key not rotated out).

Failure example:

```text title="Output"
✗ chain break at dpr-7f3b
    prev_hash on file:    aa42...
    expected hash:        bb13...
    file: ./faramesh-wal/000017.wal offset=4096
audit chain verification failed
```

A chain break is **always** investigated. It means either the WAL was tampered with, hardware corruption occurred, or a `faramesh audit compact` ran without proper merge.

### `export` — for SIEM, compliance, retention

```bash title="Terminal"
faramesh audit export --from 2026-05-01 --to 2026-05-31 --format jsonl > may.jsonl
```

Formats:

| Format | When to use |
|--------|-------------|
| `json` | Single document with metadata wrapper. Good for one-off review. |
| `jsonl` | One DPR per line. Best for SIEM ingestion and `jq` pipelines. |
| `csv` | Flattened. Useful for spreadsheet-driven compliance reviews. |

Export is **read-only**. Records are emitted with their original hashes and signatures so the consumer can re-verify offline.

### `stats` — at-a-glance counts

```bash title="Terminal"
$ faramesh audit stats --since 24h

Decisions (last 24h)
────────────────────
total      1,432
permit     1,337  (93.4%)
defer         84  (5.9%)
deny          11  (0.7%)

Top tools
  stripe/refund     412
  send_email        228
  search_docs       193

Top denial codes
  POLICY_DENY              7
  RATE_EXCEEDED            3
  CREDENTIAL_UNAVAILABLE   1
```

### `trace` — follow one logical action across DPRs

A single agent task often produces many decisions. If you propagated a `request_id` (or one was auto-generated), `trace` collects every related DPR:

```bash title="Terminal"
faramesh audit trace req-abc123
```

You get the full lineage: identity attestation, every tool call, every credential issuance, the final decision.

### `compact` — merge old WAL segments

Long-running stacks accumulate WAL segments. `compact` merges old segments into a single archive file while preserving the hash chain:

```bash title="Terminal"
faramesh audit compact --older-than 90d
```

Compaction writes a new file with a continuation hash so `verify` continues to work across the boundary. Run during low-traffic windows; it's I/O-heavy.

### `wal inspect` — diagnostic dump

```bash title="Terminal"
faramesh audit wal inspect
```

Dumps WAL file metadata: segment count, size, last record id, signature key fingerprint, schema version. Use only when debugging WAL issues.

## DPR fields you'll care about

| Field | Description |
|-------|-------------|
| `id` | Unique DPR id (`dpr-…`). The handle for `show` and `trace`. |
| `agent_id` | The agent that made the call (string in `governance.fms`). |
| `agent_ident` | Attested identity (SPIFFE id, OIDC subject, etc.). |
| `tool` | Tool name as policy sees it. |
| `args` | Post-redaction arguments. |
| `effect` | `PERMIT`, `DEFER`, `DENY`. |
| `rule_ref` | File:line of the matching rule. |
| `reason_code` | Stable code (e.g. `POLICY_DENY`, `BUDGET_EXCEEDED`). |
| `pipeline` | Per-step decision trace (identity → match → conditions → rate → budget → egress → redact → decision). |
| `credential` | Credential issuance metadata if a permit. |
| `prev_hash` / `this_hash` | Chain linkage. |
| `signature` | Optional KMS signature. |

## Production setup

```hcl title="governance.fms"
runtime {
  backend = "sqlite"           # or postgres
  wal_dir = "/var/lib/faramesh/wal"
}

provider "audit-kms" {
  type    = "kms"
  backend = "aws-kms"
  key_arn = env("FARAMESH_KMS_KEY_ARN")
}

provider "splunk" {
  type  = "splunk-sink"
  url   = env("SPLUNK_URL")
  token = env("SPLUNK_HEC_TOKEN")
  index = "faramesh-decisions"
}
```

The local WAL is the source of truth; the audit sink is for fan-out. Both record the same DPR.

## What `audit` does NOT do

- It doesn't change anything. Read-only.
- It doesn't redact arguments — redaction happens at decision time, in the pipeline.
- It doesn't re-evaluate decisions against current policy (use [`faramesh plan`](/cli/plan/) for that).

## What's next

- [Auditing concept](/concepts/auditing/) — DPR structure, hash chain, KMS verification.
- [KMS & signing](/concepts/kms/) — choosing a signer.
- [Security guide for auditors](/guides/security-engineer/) — what to collect and how to map to controls.
- [`faramesh explain`](/cli/explain/) — when you want the why, not just the what.
