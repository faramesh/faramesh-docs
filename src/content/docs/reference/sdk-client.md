---
title: SDK Client Reference
description: Full API reference for the Python and Node SDKs.
---

The Python SDK surface from `faramesh.__init__` and `client.py` includes:

- `configure()`
- `submit_action()`
- `submit_actions()`
- `submit_actions_bulk()`
- `submit_and_wait()`
- `block_until_approved()`
- `get_action()`
- `list_actions()`
- `approve_action()`
- `deny_action()`
- `start_action()`
- `wait_for_completion()`
- `tail_events()`
- `stream_events()`

The Node SDK exports the same core family and adds `gateDecide()`, `gateDecideDict()`, `replayDecision()`, `executeIfAllowed()`, and `governedTool()`.

The common client shape is: configure the endpoint, submit a Proposed Action, inspect the status/decision fields, and explicitly handle `allowed`, `pending_approval`, and `denied`.

See [Python SDK](/integrations/python-sdk/) and [Node.js SDK](/integrations/nodejs-sdk/).
