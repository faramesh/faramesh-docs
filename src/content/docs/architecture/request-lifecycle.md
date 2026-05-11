---
title: Request Lifecycle
description: What happens from action submission to execution.
---

1. The agent calls `submit_action()` or `submitAction()`.
2. The SDK posts the proposed action to Faramesh.
3. The action is canonicalized and hashed.
4. The policy engine evaluates rules in document order.
5. Risk context and other runtime signals are applied.
6. The final decision is computed.
7. `allow` executes, `deny` returns immediately, and `defer` queues the action for review.
8. Human approval or denial is written back to the ledger.
9. Every lifecycle event is appended to the evidence trail.

The exact transport differs by integration, but the sequence does not.

See [The Action Authorization Boundary](/concepts/action-authorization-boundary/) and [The Audit Ledger](/concepts/audit-ledger/).
