---
title: Storage Model
description: How Faramesh stores actions, events, policies, and secrets.
---

The runtime persists action state, decision evidence, and audit history. The command surface shows local data directories, SQLite/WAL handling, optional PostgreSQL mirroring, and the visibility/dashboard layer that reads the current runtime state.

The important property is that the stored state is tied back to the canonical request hash and the decision trail. That is what makes the ledger tamper-evident instead of just searchable.

See [Audit Ledger](/concepts/audit-ledger/) and [Database Setup](/deployment/database/).
