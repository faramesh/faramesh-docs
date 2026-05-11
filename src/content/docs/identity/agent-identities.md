---
title: Agent Identities
description: How Faramesh identifies and tracks agents.
---

`agent_id` is the identity boundary in Faramesh. The Python and Node SDKs both accept it in `submit_action()` / `submitAction()`, and the daemon uses it as a first-class field in the governance request.

That identity feeds four things in the checked-in codebase: per-agent policy rules, per-agent audit records, approval routing, and credential scoping.

```python
configure(base_url="http://localhost:8000", token="dev-token")
submit_action("prod-refund-agent", "stripe", "refund", {"amount": 50})
```

Best practice is to encode role and environment in the ID, such as `prod-refund-agent` or `dev-research-crew`.

:::note
I did not find a checked-in `profiles/` directory in the core tree, so there is no local profile schema to document here.
:::

See [Credential Sequestration](/identity/credential-sequestration/) and [Audit Ledger](/concepts/audit-ledger/).
