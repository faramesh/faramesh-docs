---
title: Quickstart (5 minutes)
description: Get Faramesh running and govern your first agent tool call.
---

The README’s source-checkout path starts with a local install, then a governed run. For this docs site, the fastest path is the same sequence the core repo uses in its quick-start flow.

1. Prerequisites: Docker and Docker Compose, plus Python 3.9+
2. Clone and start:

```bash
git clone https://github.com/faramesh/faramesh-core
cd faramesh-core
docker compose up -d
```

3. Install the SDK:

```bash
pip install faramesh
```

4. Write a minimal policy. The repo’s checked-in YAML examples use this shape:

```yaml
faramesh-version: "1.0"
agent-id: "payment-agent"
default_effect: deny

rules:
  - id: deny-shell
    match:
      tool: "shell/*"
      when: "true"
    effect: deny
    reason: "payment agents must not use shell"

  - id: permit-customer-read
    match:
      tool: "read_customer"
      when: "true"
    effect: permit
```

5. Submit a governed action from Python:

```python
from faramesh import configure, submit_action

configure(base_url="http://localhost:8000", token="dev-token")
action = submit_action("payment-agent", "http", "get", {"url": "https://example.com"})
print(action["status"], action["decision"], action["reason"])
```

6. View the result in the web UI at `http://localhost:8000`.

7. What happened: the action was canonicalized, hashed, evaluated against policy, scored for risk context, and written into the Audit Ledger before execution or deferral.

:::tip
The checked-in SDK exposes `submit_action()`, `submit_and_wait()`, `approve_action()`, `deny_action()`, `list_actions()`, and the `allow` alias for approval flows. See [Python SDK](/integrations/python-sdk/) and [SDK Client Reference](/reference/sdk-client/).
:::

Next: [Installation](/getting-started/installation/) and [Your First Policy](/getting-started/your-first-policy/).
