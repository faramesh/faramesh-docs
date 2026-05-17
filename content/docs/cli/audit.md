---
title: faramesh audit
description: Inspect and verify the Decision Provenance Record chain.
---

```bash
faramesh audit tail [--agent ID] [--limit N]
faramesh audit show <dpr-id>
faramesh audit verify [--dir DIR]
faramesh audit compact
faramesh audit wal inspect
faramesh audit export ...
faramesh audit stats
faramesh audit trace <correlation-id>
```

Reads the hash-chained WAL and optional SQLite index. `verify` walks the chain and signature status end-to-end — run after incidents or before compliance exports.

Dev mode uses an in-memory WAL; use `apply` with `wal_dir` for durable audit on disk.
