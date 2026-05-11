---
title: Faramesh Horizon
description: Fully managed Faramesh without infrastructure overhead.
---

Horizon is the managed tier in the product story. The checked-in core repo documents how the daemon can sync decision records to Horizon, and the README frames Horizon as the cloud-managed counterpart to the self-hosted runtime.

Use Horizon when you want the governance plane without operating the underlying runtime yourself. The exact cloud-only feature set lives outside this core repo, so this page stays focused on the boundary the source code actually knows about: syncing records and managing the runtime through its governed interfaces.

See [Self-Hosted Deployment](/deployment/self-hosted/) and [Audit Ledger](/concepts/audit-ledger/).
