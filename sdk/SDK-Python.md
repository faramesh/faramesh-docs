# Python SDK

The Faramesh Python SDK provides a production-ready client for integrating AI agents with Faramesh governance.

## Installation

```bash
pip install faramesh
```

**Development Installation:**
```bash
git clone https://github.com/faramesh/faramesh-core.git
cd faramesh
pip install -e .
```

---

## Quick Start

```python
from faramesh import configure, submit_action

# Configure client
configure(base_url="http://127.0.0.1:8000", token="dev-token")

# Submit action
action = submit_action(
    agent_id="my-agent",
    tool="http",
    operation="get",
    params={"url": "https://example.com"}
)

print(f"Action ID: {action['id']}")
print(f"Status: {action['status']}")
print(f"Risk Level: {action.get('risk_level')}")
```

---

## Configuration

### Global Configuration

Use `configure()` to set global configuration:

```python
from faramesh import configure

configure(
    base_url="http://127.0.0.1:8000",
    token="dev-token",
    agent_id="my-agent",
    timeout=30.0,
    max_retries=3,
    retry_backoff_factor=0.5
)
```

### ClientConfig Class

For more control, use `ClientConfig`:

```python
from faramesh import ClientConfig, configure

config = ClientConfig(
    base_url="http://localhost:8000",
    agent_id="my-agent",
    token="dev-token",
    timeout=30.0,
    max_retries=3,
    retry_backoff_factor=0.5
)

configure(config=config)
```

### Environment Variables

Configuration can be set via environment variables:

- `FARAMESH_BASE_URL` - API base URL (default: `http://127.0.0.1:8000`)
- `FARAMESH_TOKEN` - Authentication token
- `FARAMESH_RETRIES` - Maximum retries (default: 3)
- `FARAMESH_RETRY_BACKOFF` - Retry backoff factor (default: 0.5)

**Legacy Variables (still supported):**
- `FARA_API_BASE` → `FARAMESH_BASE_URL`
- `FARA_AUTH_TOKEN` → `FARAMESH_TOKEN`

---

## Core Functions

### Submitting Actions

**Single Action:**
```python
from faramesh import submit_action

action = submit_action(
    agent_id="my-agent",
    tool="shell",
    operation="run",
    params={"cmd": "echo hello"},
    context={"user": "alice"}
)
```

**Batch Submission:**
```python
from faramesh import submit_actions

actions = [
    {"agent_id": "agent1", "tool": "http", "operation": "get", "params": {"url": "https://example.com"}},
    {"agent_id": "agent2", "tool": "shell", "operation": "run", "params": {"cmd": "ls"}},
]

results = submit_actions(actions)
```

**Bulk Submission:**
```python
from faramesh import submit_actions_bulk

# For very large batches
results = submit_actions_bulk(actions, batch_size=100)
```

**Submit and Wait:**
```python
from faramesh import submit_and_wait

# Submit and wait for completion (with auto-approval if needed)
final = submit_and_wait(
    agent_id="my-agent",
    tool="http",
    operation="get",
    params={"url": "https://example.com"},
    auto_approve=True,  # Automatically approve if pending
    timeout=60.0
)
```

### Getting Actions

**Get Single Action:**
```python
from faramesh import get_action

action = get_action("2755d4a8-1000-47e6-873c-b9fd535234ad")
```

**List Actions:**
```python
from faramesh import list_actions

# List all actions
actions = list_actions()

# With filters
actions = list_actions(
    limit=50,
    status="pending_approval",
    tool="shell",
    agent_id="my-agent"
)
```

### Approval Workflow

**Approve Action:**
```python
from faramesh import approve_action

result = approve_action(
    action_id="2755d4a8-...",
    token="approval-token",  # From action['approval_token']
    reason="Looks safe"
)
```

**Deny Action:**
```python
from faramesh import deny_action

result = deny_action(
    action_id="2755d4a8-...",
    token="approval-token",
    reason="Too risky"
)
```

**Wait for Approval:**
```python
from faramesh import block_until_approved

# Block until action is approved or denied
final = block_until_approved("2755d4a8-...", timeout=300.0)
```

**Convenience Aliases:**
```python
from faramesh import allow, deny

# Same as approve_action/deny_action
allow("2755d4a8-...", token="...")
deny("2755d4a8-...", token="...")
```

### Execution

**Start Action:**
```python
from faramesh import start_action

result = start_action("2755d4a8-...")
```

**Wait for Completion:**
```python
from faramesh import wait_for_completion

# Wait for action to complete (succeeded or failed)
final = wait_for_completion("2755d4a8-...", timeout=300.0)
```

**Replay Action:**
```python
from faramesh import replay_action

# Create new action with same parameters
new_action = replay_action("2755d4a8-...")
```

### File-Based Operations

**Apply Action from File:**
```python
from faramesh import apply

# Submit action from YAML or JSON file
action = apply("examples/file_apply.yaml")
action = apply("examples/http_action.json")
```

### Event Streaming

**Tail Events (SSE):**
```python
from faramesh import tail_events

# Stream events (like tail -f)
for event in tail_events():
    print(f"Event: {event['event_type']} for action {event['action_id']}")
```

**Stream Events:**
```python
from faramesh import stream_events

# More control over streaming
async for event in stream_events():
    print(event)
```

---

## Error Handling

### Exception Classes

All SDK errors derive from `FarameshError`:

```python
from faramesh import (
    FarameshError,
    FarameshAuthError,
    FarameshNotFoundError,
    FarameshPolicyError,
    FarameshTimeoutError,
    FarameshConnectionError,
    FarameshValidationError,
    FarameshServerError,
    FarameshBatchError,
    FarameshDeniedError,
)
```

### Error Handling Example

```python
from faramesh import submit_action, FarameshAuthError, FarameshPolicyError, FarameshError

try:
    action = submit_action("agent", "shell", "run", {"cmd": "echo hello"})
except FarameshAuthError as e:
    print(f"Authentication error: {e}")
except FarameshPolicyError as e:
    print(f"Action denied by policy: {e}")
except FarameshError as e:
    print(f"Faramesh error: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

### Error Types

| Exception | HTTP Status | When It Occurs |
|-----------|-------------|----------------|
| `FarameshAuthError` | 401 | Missing or invalid token |
| `FarameshNotFoundError` | 404 | Action not found |
| `FarameshPolicyError` | 400/422 | Policy validation error |
| `FarameshValidationError` | 422 | Request validation error |
| `FarameshDeniedError` | 400 | Action denied by policy |
| `FarameshTimeoutError` | - | Request timeout |
| `FarameshConnectionError` | - | Connection error |
| `FarameshServerError` | 500 | Server error |
| `FarameshBatchError` | - | Batch operation error |

---

## Advanced Usage

### Complete Workflow Example

```python
from faramesh import (
    configure, submit_action, get_action,
    approve_action, wait_for_completion
)

configure(base_url="http://127.0.0.1:8000")

# Submit action
action = submit_action(
    agent_id="my-agent",
    tool="shell",
    operation="run",
    params={"cmd": "echo hello"}
)

print(f"Action {action['id']} status: {action['status']}")

# If pending approval, approve it
if action['status'] == 'pending_approval':
    approved = approve_action(
        action['id'],
        token=action['approval_token'],
        reason="Looks safe"
    )
    print(f"Approved: {approved['status']}")

# Wait for completion
if action['status'] in ('allowed', 'approved'):
    final = wait_for_completion(action['id'], timeout=60.0)
    print(f"Final status: {final['status']}")
    if final['status'] == 'succeeded':
        print("Action completed successfully!")
    elif final['status'] == 'failed':
        print(f"Action failed: {final.get('error')}")
```

### Retry Logic

The SDK includes automatic retry logic:

```python
from faramesh import configure, ClientConfig

# Configure retries
config = ClientConfig(
    base_url="http://127.0.0.1:8000",
    max_retries=5,  # Retry up to 5 times
    retry_backoff_factor=1.0  # Exponential backoff
)
configure(config=config)
```

### Timeout Configuration

```python
from faramesh import configure

configure(timeout=60.0)  # 60 second timeout for all requests
```

### Custom Telemetry

```python
from faramesh import configure, ClientConfig

def on_request_start(method, url):
    print(f"Starting {method} {url}")

def on_request_end(method, url, status_code, duration_ms):
    print(f"Completed {method} {url} in {duration_ms}ms (status: {status_code})")

def on_error(error):
    print(f"Error: {error}")

config = ClientConfig(
    base_url="http://127.0.0.1:8000",
    on_request_start=on_request_start,
    on_request_end=on_request_end,
    on_error=on_error
)
configure(config=config)
```

---

## Policy Helpers

### Validate Policy File

```python
from faramesh import validate_policy_file

errors = validate_policy_file("policies/default.yaml")
if errors:
    print("Policy validation errors:", errors)
else:
    print("Policy is valid!")
```

### Test Policy Against Action

```python
from faramesh import test_policy_against_action

result = test_policy_against_action(
    policy_file="policies/default.yaml",
    tool="shell",
    operation="run",
    params={"cmd": "echo hello"},
    context={"agent_id": "test-agent"}
)

print(f"Decision: {result['decision']}")
print(f"Reason: {result['reason']}")
print(f"Risk Level: {result['risk_level']}")
```

### Policy Models

Build policies programmatically:

```python
from faramesh import Policy, PolicyRule, MatchCondition, RiskRule, RiskLevel, create_policy

# Create policy
policy = create_policy(
    rules=[
        PolicyRule(
            match=MatchCondition(tool="http", op="get"),
            allow=True,
            description="Allow HTTP GET"
        ),
        PolicyRule(
            match=MatchCondition(tool="shell", op="*"),
            require_approval=True,
            description="Shell commands require approval"
        )
    ],
    risk_rules=[
        RiskRule(
            name="dangerous_shell",
            when=MatchCondition(tool="shell", pattern="rm -rf"),
            risk_level=RiskLevel.HIGH
        )
    ]
)

# Convert to YAML
yaml_str = policy.to_yaml()
```

---

## Decorators

### Governed Tool Decorator

Wrap functions with Faramesh governance:

```python
from faramesh import governed_tool, configure

configure(base_url="http://127.0.0.1:8000")

@governed_tool(agent_id="my-agent", tool="shell", operation="run")
def execute_command(cmd: str):
    """Execute a shell command with Faramesh governance."""
    import subprocess
    result = subprocess.run(cmd, shell=True, capture_output=True)
    return result.stdout.decode()

# Use the governed function
output = execute_command("echo hello")
# Function automatically submits to Faramesh, waits for approval, executes, and reports result
```

---

## Legacy API

For backward compatibility, the class-based API is still available:

```python
from faramesh.sdk.client import ExecutionGovernorClient

client = ExecutionGovernorClient("http://127.0.0.1:8000")

action = client.submit_action(
    tool="shell",
    operation="run",
    params={"cmd": "echo hello"},
    context={"agent_id": "my-agent"}
)
```

---

## Best Practices

### 1. Always Handle Errors

```python
try:
    action = submit_action(...)
except FarameshPolicyError:
    # Handle policy denial
    pass
except FarameshError as e:
    # Handle other Faramesh errors
    print(f"Error: {e}")
```

### 2. Use Timeouts

```python
# Set reasonable timeouts
configure(timeout=30.0)

# Or per-request
final = wait_for_completion(action_id, timeout=60.0)
```

### 3. Check Status Before Operations

```python
action = get_action(action_id)

if action['status'] == 'pending_approval':
    # Approve if needed
    approve_action(...)
elif action['status'] == 'allowed':
    # Can execute immediately
    start_action(action_id)
```

### 4. Use Batch Operations for Multiple Actions

```python
# Instead of loop
actions = submit_actions([...])  # More efficient
```

### 5. Monitor with Event Streaming

```python
for event in tail_events():
    if event['event_type'] == 'approved':
        # Handle approval
        pass
```

---

## See Also

- [API Reference](API.md) - REST API endpoints
- [Error Handling](ERROR-HANDLING.md) - Error codes and handling
- [Integration Guide](INTEGRATIONS.md) - Framework integrations
- [Quick Start](../QUICKSTART.md) - Getting started guide
