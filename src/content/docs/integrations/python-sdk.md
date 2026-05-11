---
title: Python SDK
description: Install and use the Faramesh Python SDK to govern agent tool calls.
---

The Python SDK exports the core governance functions directly from `faramesh.__init__`. The main entry points are `configure()`, `submit_action()`, `submit_actions()`, `submit_and_wait()`, `get_action()`, `list_actions()`, `approve_action()`, `deny_action()`, `block_until_approved()`, `start_action()`, `wait_for_completion()`, `tail_events()`, and `stream_events()`.

`ClientConfig` resolves `base_url`, `agent_id`, `token`, retry settings, and telemetry callbacks from explicit parameters or environment variables such as `FARAMESH_BASE_URL`, `FARAMESH_TOKEN`, `FARAMESH_RETRIES`, and `FARAMESH_RETRY_BACKOFF`.

```python
from faramesh import configure, submit_action, submit_and_wait

configure(base_url="http://localhost:8000", token="dev-token")
action = submit_action("finance-agent", "stripe", "refund", {"amount": 75})
```

`submit_action()` returns the action record, including status, decision, reason, and risk-level fields. `submit_and_wait()` adds the approval and completion flow.

Read [Govern Your Own Tool](/integrations/govern-your-own-tool/) for the wrapper pattern, and [SDK Client Reference](/reference/sdk-client/) for the function-by-function list.
