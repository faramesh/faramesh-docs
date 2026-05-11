---
title: Cryptographic Hashing & Replay Protection
description: How Faramesh uses SHA-256 hashes to create tamper-evident evidence.
---

The canonicalized action payload is hashed with SHA-256. That hash is stored with the action and used to prove the request body did not silently change after submission.

Replay protection comes from the combination of canonicalization, exclusion of ephemeral fields, and the stored request hash. If the same semantic intent comes through twice, the system can compare the canonical form instead of guessing based on text formatting.

See [Deterministic Canonicalization](/concepts/deterministic-canonicalization/) and [Audit Ledger](/concepts/audit-ledger/).
