---
title: faramesh approvals
description: List, show, approve, and deny deferred tool calls.
---

```bash
faramesh approvals list [--json]
faramesh approvals pending
faramesh approvals show <approval-id>
faramesh approvals approve <approval-id> [--reason TEXT]
faramesh approvals deny <approval-id> [--reason TEXT]
faramesh approvals watch
faramesh approvals history
```

Deferred decisions (`POLICY_DEFER`) create an approval record. Operators use these commands (or the approvals UI subcommand) to resolve them; the agent retries after approval.

Typical zero-infra flow:

```bash
faramesh dev
# agent triggers defer → note approval id
faramesh approvals list
faramesh approvals approve apr-...
```

See [Denial codes](/errors/#policy_defer).
