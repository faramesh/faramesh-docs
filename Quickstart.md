## Quickstart

**Faramesh Core — Execution gatekeeper for AI agents.**

This guide shows the fastest way to get Faramesh running locally and see an action flow end‑to‑end.

### 1. Install

```bash
pip install -e .
```

Optional DX extras:

```bash
pip install -e ".[cli]"
```

### 2. Start the server

```bash
faramesh serve
```

Defaults:

- **API**: `http://127.0.0.1:8000`
- **Policy file**: `policies/default.yaml`
- **DB**: `data/actions.db` (SQLite)

### 3. Open the UI

```bash
open http://127.0.0.1:8000
```

You should see the Faramesh dashboard, with an empty action list on first run.

### 4. Submit an action via Python

```python
from faramesh.sdk import configure, submit_action

configure(base_url="http://127.0.0.1:8000")

action = submit_action(
    "quickstart-agent",
    "shell",
    "run",
    {"cmd": "echo 'Hello Faramesh'"},
)

print(action["id"], action["status"], action.get("risk_level"))
```

If the default policy requires approval for shell commands, you should see:

- Status: `pending_approval`
- Risk: usually `medium` or `high` depending on policy.

### 5. Approve in the UI or CLI

**From the UI:**

- Find the action in the table.
- Click it to open the detail drawer.
- Click **Approve**.

**From the CLI:**

```bash
faramesh list
faramesh approve <action-id-prefix>
```

### 6. Replay or inspect

```bash
faramesh explain <action-id-prefix>
faramesh events <action-id-prefix>
faramesh replay <action-id-prefix>
```

### 7. TL;DR one‑liner

```bash
pip install -e . && faramesh serve
```

Then:

- UI at `http://127.0.0.1:8000`
- Python SDK: `pip install faramesh`
- Node SDK: `npm install @faramesh/sdk`

