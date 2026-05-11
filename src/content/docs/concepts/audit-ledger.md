---
title: The Audit Ledger
description: A complete event timeline for every action Faramesh evaluates.
---

The README describes tamper-evident decision evidence; the audit commands in `cmd/faramesh/audit.go` make that concrete. Actions flow through a lifecycle such as `created`, `evaluated`, `approved`, `executed`, or `denied`, and the runtime can stream those decisions live.

The ledger stores the data that matters for post-incident reconstruction: action ID, canonical request hash, tool, operation, params, agent ID, matched rule, reason, risk context, and human approver when a defer is resolved.

```bash
faramesh audit tail
faramesh audit verify
faramesh policy simulate policies/payment.yaml --json
```

Immutability comes from the hash chain. If the canonical hash changes, the record no longer matches the evidence that was originally produced.

The ledger is used for compliance, incident analysis, and operational accounting. See [Storage Model](/architecture/storage-model/) and [Cryptographic Hashing](/security/cryptographic-hashing/) for the lower-level mechanics.
