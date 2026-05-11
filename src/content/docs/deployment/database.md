---
title: Database Setup
description: SQLite by default, PostgreSQL for production.
---

The runtime supports local persistence with SQLite and mirrored writes to PostgreSQL for production setups. The daemon flags include `--dpr-dsn` and a data directory setting for the local state files.

Use SQLite when you want a simple local run or a single-node deployment. Move to PostgreSQL when you need production durability, mirrored decision provenance, or operational separation between the daemon and the storage backend.

The important part is not the database brand; it is that the audit chain, action state, and approval flow are persisted consistently.

See [Self-Hosted Deployment](/deployment/self-hosted/) and [Audit Ledger](/concepts/audit-ledger/).
