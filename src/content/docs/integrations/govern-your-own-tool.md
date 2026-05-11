---
title: Govern Your Own Tool
description: Wrap any custom function or API call with Faramesh governance.
---

This is the general-purpose integration pattern. Intercept the call, submit a Proposed Action, and execute the real work only if Faramesh allows it.

### Python

```python
from faramesh import configure, submit_action

configure(base_url="http://localhost:8000", token="dev-token")

def refund_customer(customer_id: str, amount: float) -> dict:
    action = submit_action(
        "payment-agent",
        "stripe/refund",
        "refund",
        {"customer_id": customer_id, "amount": amount},
    )
    if action["status"] in ("denied", "pending_approval"):
        return action
    return {"executed": True, "action_id": action["id"]}
```

The checked-in Python decorator `governed_tool()` does the same wrapping pattern for you.

### Node

```typescript
import { governedTool } from "@faramesh/sdk";

const governedRefund = governedTool(
  { agentId: "payment-agent", tool: "stripe/refund", operation: "refund" },
  async (customerId: string, amount: number) => ({ customerId, amount })
);
```

Use semantic tool IDs that match your policy, not just the underlying function name. That keeps policy readable and avoids accidental overbroad matches.

See [Python SDK](/integrations/python-sdk/) and [Node.js SDK](/integrations/nodejs-sdk/).
