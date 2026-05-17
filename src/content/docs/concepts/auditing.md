---
title: Auditing
description: Decision Provenance Records, the hash-chained WAL, KMS signing, and how Faramesh proves what happened.
---

Faramesh records every decision into a **Decision Provenance Record** (DPR), writes it to a **hash-chained WAL**, and optionally signs it with an **external KMS**. The result is a sequence you can verify end-to-end with one command.

This page covers what's in a DPR, how the chain is built, how to verify it, and how to ship the stream into your SIEM.

## What a DPR contains

Every `permit`, `defer`, `deny`, `budget_warning`, and `rate_exceeded` produces a DPR. The schema (version `dpr/2.0`) carries:

| Field | Description |
|-------|-------------|
| `id` | ULID for the decision. Returned to the SDK as `action-<ulid>`. |
| `time` | RFC3339 timestamp. |
| `lamport_seq` | Per-agent monotonically increasing sequence. Makes ordering total. |
| `agent_id` | Agent identity as resolved by the identity provider. |
| `agent_svid` | SPIFFE id, if a SPIFFE provider is configured. |
| `tool` | Tool name. |
| `action_type` | `tool_call`, `delegate`, `completion_event`, `model_call`. |
| `args_hash` | SHA-256 of the redacted argument tree. |
| `effect` | `permit`, `defer`, `deny`. |
| `rule_ref` | File + line of the rule that fired (`governance.fms:12`). |
| `rule_digest` | Hash of the compiled rule AST node. |
| `policy_version` | Hash of the full compiled AST. |
| `denial` | Structured denial payload (when applicable). See [errors](/errors/). |
| `credential_ref` | Provider id + scope hash if a credential was minted. |
| `cost` | Tokens and dollars (from the cost provider). |
| `latency_ms` | Pipeline timing per stage. |
| `delegation_chain` | Parent decisions if this call came from a delegation. |
| `prev_hash` | SHA-256 of the previous DPR. |
| `signature` | Detached signature over the canonical DPR bytes. |

**Args are never stored raw.** Only the SHA-256 of the redacted-args tree is in the DPR. The redacted args themselves go to the audit sink stream, where you control retention and access.

## The hash chain

```text
DPR(n-1)  ──hash──►   prev_hash field of DPR(n)   ──KMS sign──►   signature field
```

Each DPR carries the hash of the previous DPR. A break in the chain (`prev_hash` mismatch) signals tampering or a missing record. The first DPR after a `faramesh apply` carries the **policy version hash** so you can prove which policy was in force during which window.

### Signatures

Two signing modes:

| Mode | Where the key lives | When to use |
|------|---------------------|-------------|
| Local | Ephemeral ed25519 key on disk | Local runs and CI. Chain verifies; tampering requires writing both DPRs and the key. |
| External KMS | AWS KMS, GCP KMS, or HashiCorp Vault Transit | Production. The daemon never holds the private key; an attacker with root cannot re-sign forged segments. |

Configure the KMS provider in `governance.fms`:

```fpl
provider "kms-aws" {
  type    = "aws-kms"
  region  = "us-east-1"
  key_arn = "arn:aws:kms:us-east-1:123456789012:key/abc-123"
}
```

The daemon batches DPR signing — calls return immediately on `permit` and the signature is added asynchronously. The signing latency does not block tool execution.

## The WAL

The WAL is the append-only log that backs the DPR chain. By default it lives in `wal_dir` (set in `runtime { ... }`) as a sequence of sealed segments plus an active segment:

```text
faramesh-wal/
├─ active.wal              ← currently being written
├─ 00000001.wal            ← sealed
├─ 00000001.wal.manifest   ← segment manifest with hash root
├─ 00000002.wal            ← sealed
└─ ...
```

Sealed segments are immutable; a tampered byte breaks the manifest hash.

Backends:

| Backend | Use |
|---------|-----|
| `sqlite` | Default. Local file. Suitable for single-host stacks. |
| `postgres` | Production. WAL is replicated as a Postgres table; multi-daemon stacks share state. |

`runtime { backend = "postgres" }` plus a connection string switches you over without policy changes.

## Verification

The CLI walks the chain and verifies every signature:

```bash
faramesh audit verify
faramesh audit verify --from 2026-05-01 --to 2026-05-31
```

Example output:

```
Verifying WAL segments 1..12 (122,041 DPRs)
  signature scheme  : aws-kms (arn:aws:kms:...:key/abc-123)
  chain hash root   : ok
  per-segment manifests : 12/12 ok
  policy continuity : 4 policy versions, no gaps
✓ Chain is intact.
```

Any failure prints the first offending DPR id and the field that broke (`prev_hash mismatch`, `signature invalid`, `args_hash mismatch`).

## `faramesh explain`

For a single decision, `faramesh explain <action-id>` reconstructs the full pipeline:

```
Decision  action-01JTX5Y0K9
Time      2026-05-17T13:42:18Z
Agent     payments-bot   (spiffe://corp.faramesh.dev/agents/payments-bot)
Tool      stripe/charge
Effect    permit
Rule      governance.fms:12  permit stripe/charge if amount < $500
Args      { amount: 240.00, currency: "USD" }
          (raw args read from audit-splunk; redacted: card_number, cvv)
Credential vault://kv/data/payments/stripe-token  (issued 13:42:18, ttl 30s)
Cost      $0.0021  (cost-static@1.0.0)
Latency   policy 0.7ms · credential 4.1ms · execute 142ms · total 146.9ms
Signature ok (aws-kms key/abc-123)
Chain     prev_hash matches; chain intact back to 00000001.wal
```

## Streaming to your SIEM

DPRs are also fanned out to **audit sinks** for downstream consumption. The WAL is authoritative — the sink stream is a copy for indexing and search.

Built-in sinks:

| Sink | Configuration |
|------|---------------|
| Splunk HEC | `splunk-sink` provider |
| Datadog Logs | `datadog-sink` provider |
| Elastic | `elastic-sink` provider |
| S3 | `s3-sink` (NDJSON files per hour) |
| GCS | `gcs-sink` |
| Webhook | `webhook-sink` |
| stdout | Default in [local runs](/dev/) |

See [Providers → audit sinks](/providers/#audit-sinks).

## What's redacted, what's logged

| Field | In DPR | In sink stream |
|-------|--------|----------------|
| Tool name | Yes | Yes |
| Args (named in `redact`) | Hash only | Masked tokens (`***`) |
| All other args | Hash only | Full value |
| Credential value | Never | Never |
| Credential ref / scope / TTL | Yes | Yes |
| Rule that fired | Yes (`rule_ref`) | Yes |
| Result code | Yes | Yes |
| Latency breakdown | Yes | Yes |

You never put raw secrets in the audit chain. Anything an operator might be tempted to log is configurable via `redact`.

## Compaction and retention

Sealed segments older than `wal_retention` are compacted into a single signed manifest plus a per-DPR digest index. The full bodies move to the audit sink for long-term storage; the chain stays intact because each compacted segment keeps its manifest hash.

```fpl
runtime {
  wal_retention = "90d"
}
```

`faramesh audit verify --include-archived` walks both the live WAL and the compacted manifests.

## Compliance affordances

- **GDPR / right-to-erasure.** Redact-by-default for any field that may contain PII. The DPR records only a hash; the sink retention controls where raw values live.
- **SOC 2 / evidence.** `faramesh audit export --from --to --format csv` produces a per-decision CSV with the full pipeline. KMS signature metadata is preserved.
- **PCI / financial.** Use `redact <tool> args: ["card_number", "cvv"]` and a KMS that produces FIPS-validated signatures. The chain is your tamper-evidence boundary.

## What's next

- [CLI → audit](/cli/#audit) — every audit command and flag
- [Providers → KMS](/providers/#kms--signing-provider) — production signing setup
- [Security model](/security/) — what the audit chain protects against
- [Denial codes](/errors/) — the structured payloads recorded for non-permits
