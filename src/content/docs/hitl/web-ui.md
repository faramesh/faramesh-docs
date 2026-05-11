---
title: Web UI & Dashboard
description: Review pending actions, inspect the audit ledger, and manage agents.
---

The README and daemon flags both point at a local UI/dashboard workflow. The runtime can serve live governance state, and the docs site mirrors that as the default place to inspect pending actions and evidence.

The key views are:

- pending actions queue
- action history / audit ledger
- agent overview
- policy management where supported by the build

Live updates are streamed by the runtime’s callback and audit subscriptions. That keeps the UI aligned with the actual governance state instead of a stale refresh.

Open `http://localhost:8000` when running the local stack. Then navigate between the UI and the audit stream to confirm the decision trail.

See [Audit Ledger](/concepts/audit-ledger/) and [Request Lifecycle](/architecture/request-lifecycle/).
