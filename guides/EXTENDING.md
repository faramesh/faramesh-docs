# Extending Faramesh: Govern Your Own Tool

This guide shows you how to wrap your own custom tools and functions with Faramesh governance. You'll learn to integrate Faramesh into any function or tool that performs actions.

## Overview

The integration pattern is simple:

1. **Define your tool** (function, class, or API call)
2. **Submit action to Faramesh** before execution
3. **Check status** (allow/deny/pending_approval)
4. **Execute only if allowed**
5. **Report result** back to Faramesh

---

## Quick Start Example

### Simple Function Wrapper

```python
from faramesh import configure, submit_action, wait_for_completion, start_action

configure(base_url="http://127.0.0.1:8000")

def refund_customer(amount: float, customer_id: str) -> dict:
    """
    Refund a customer - wrapped with Faramesh governance.
    """
    # 1. Submit action to Faramesh
    action = submit_action(
        agent_id="billing-bot",
        tool="refund",
        operation="process",
        params={
            "amount": amount,
            "customer_id": customer_id,
        }
    )
    
    # 2. Check status and wait for approval if needed
    if action['status'] == 'denied':
        raise PermissionError(f"Refund denied: {action.get('reason')}")
    
    if action['status'] == 'pending_approval':
        # Wait for approval (with timeout)
        final = wait_for_completion(action['id'], timeout=300.0)
        if final['status'] == 'denied':
            raise PermissionError("Refund was denied")
        action = final
    
    # 3. Execute only if allowed/approved
    if action['status'] not in ('allowed', 'approved'):
        raise PermissionError(f"Refund not approved. Status: {action['status']}")
    
    # 4. Perform the actual refund
    try:
        # Your actual refund logic here
        result = {
            "success": True,
            "refund_id": f"ref_{action['id'][:8]}",
            "amount": amount,
            "customer_id": customer_id,
        }
        
        # 5. Start execution and report result
        start_action(action['id'])
        # ... perform refund ...
        # Report success (via API or SDK)
        return result
        
    except Exception as e:
        # Report failure
        raise
```

---

## Complete Example: Refund Function

```python
from faramesh import (
    configure, submit_action, get_action,
    approve_action, wait_for_completion, start_action
)
import time

configure(base_url="http://127.0.0.1:8000")

def refund_customer(amount: float, customer_id: str) -> dict:
    """
    Refund a customer - wrapped with Faramesh governance.
    """
    # 1. Submit action to Faramesh
    action = submit_action(
        agent_id="billing-bot",
        tool="refund",
        operation="process",
        params={
            "amount": amount,
            "customer_id": customer_id,
        },
        context={
            "function": "refund_customer",
            "environment": "production",
        }
    )
    
    action_id = action['id']
    status = action['status']
    decision = action.get('decision', '')
    
    # 2. Check status
    if decision == 'deny' or status == 'denied':
        reason = action.get('reason', 'Action denied by policy')
        raise PermissionError(f"Refund denied: {reason}")
    
    if status == 'pending_approval':
        # Option 1: Wait and poll for approval
        print(f"Refund requires approval. Action ID: {action_id}")
        print(f"Open http://127.0.0.1:8000 to approve/deny")
        
        final = wait_for_completion(action_id, timeout=300.0)
        if final['status'] == 'denied':
            raise PermissionError("Refund was denied")
        action = final
        
        # Option 2: Exit and let user approve manually
        # raise PermissionError(f"Refund pending approval: {action_id}")
    
    # 3. Execute only if allowed/approved
    if status not in ('allowed', 'approved'):
        raise PermissionError(f"Refund not approved. Status: {status}")
    
    # 4. Perform the actual refund
    try:
        # Mark as started
        start_action(action_id)
        
        # Your actual refund logic here
        # (e.g., call payment API, update database, etc.)
        result = {
            "success": True,
            "refund_id": f"ref_{action_id[:8]}",
            "amount": amount,
            "customer_id": customer_id,
        }
        
        # 5. Report result to Faramesh (via API)
        from faramesh.sdk.client import ExecutionGovernorClient
        client = ExecutionGovernorClient("http://127.0.0.1:8000")
        client.report_result(action_id, success=True, error=None)
        
        return result
        
    except Exception as e:
        # Report failure
        from faramesh.sdk.client import ExecutionGovernorClient
        client = ExecutionGovernorClient("http://127.0.0.1:8000")
        client.report_result(action_id, success=False, error=str(e))
        raise
```

---

## Example: Delete User Function

```python
from faramesh import configure, submit_action, wait_for_completion, start_action

configure(base_url="http://127.0.0.1:8000")

def delete_user(user_id: str) -> bool:
    """
    Delete a user - requires approval for safety.
    """
    # Submit to Faramesh
    action = submit_action(
        agent_id="admin-bot",
        tool="user_management",
        operation="delete",
        params={"user_id": user_id}
    )
    
    # Check decision
    if action['status'] == 'denied':
        raise PermissionError(f"Delete denied: {action.get('reason')}")
    
    if action['status'] == 'pending_approval':
        print(f"Delete requires approval: {action['id']}")
        final = wait_for_completion(action['id'], timeout=300.0)
        if final['status'] == 'denied':
            raise PermissionError("Delete was denied")
        action = final
    
    # Execute if allowed
    if action['status'] not in ('allowed', 'approved'):
        raise PermissionError("Delete not approved")
    
    # Perform deletion
    try:
        start_action(action['id'])
        # Your deletion logic
        success = True
        
        # Report result
        from faramesh.sdk.client import ExecutionGovernorClient
        client = ExecutionGovernorClient("http://127.0.0.1:8000")
        client.report_result(action['id'], success=success)
        return success
    except Exception as e:
        from faramesh.sdk.client import ExecutionGovernorClient
        client = ExecutionGovernorClient("http://127.0.0.1:8000")
        client.report_result(action['id'], success=False, error=str(e))
        raise
```

---

## Policy Configuration

Create a policy that requires approval for refunds over $100:

```yaml
# policies/default.yaml
rules:
  # Require approval for large refunds
  - match:
      tool: "refund"
      op: "process"
      amount_gt: 100
    require_approval: true
    description: "Large refunds require approval"
    risk: "high"

  # Allow small refunds automatically
  - match:
      tool: "refund"
      op: "process"
      amount_lte: 100
    allow: true
    description: "Small refunds are safe"
    risk: "low"

  # Default deny
  - match:
      tool: "*"
      op: "*"
    deny: true
```

---

## Integration Patterns

### Pattern 1: Decorator

```python
from functools import wraps
from faramesh import configure, submit_action, wait_for_completion, start_action

configure(base_url="http://127.0.0.1:8000")

def governed_action(tool: str, operation: str, agent_id: str = "default-agent"):
    """Decorator to wrap functions with Faramesh governance."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Submit action
            action = submit_action(
                agent_id=agent_id,
                tool=tool,
                operation=operation,
                params=kwargs  # Or extract from args/kwargs
            )
            
            # Wait for approval if needed
            if action['status'] == 'pending_approval':
                final = wait_for_completion(action['id'], timeout=300.0)
                if final['status'] == 'denied':
                    raise PermissionError("Action denied")
                action = final
            
            # Execute if allowed
            if action['status'] not in ('allowed', 'approved'):
                raise PermissionError(f"Action not approved: {action['status']}")
            
            # Execute function
            start_action(action['id'])
            try:
                result = func(*args, **kwargs)
                # Report success
                return result
            except Exception as e:
                # Report failure
                raise
        return wrapper
    return decorator

# Usage
@governed_action(tool="refund", operation="process", agent_id="billing-bot")
def refund(amount: float, customer_id: str):
    # Your refund logic
    return {"refund_id": "ref_123"}
```

### Pattern 2: Class Wrapper

```python
from faramesh import configure, submit_action, wait_for_completion, start_action

configure(base_url="http://127.0.0.1:8000")

class GovernedRefundService:
    def __init__(self, agent_id: str = "billing-bot"):
        self.agent_id = agent_id
    
    def refund(self, amount: float, customer_id: str):
        # Submit action
        action = submit_action(
            agent_id=self.agent_id,
            tool="refund",
            operation="process",
            params={"amount": amount, "customer_id": customer_id}
        )
        
        # Wait for approval if needed
        if action['status'] == 'pending_approval':
            final = wait_for_completion(action['id'], timeout=300.0)
            if final['status'] == 'denied':
                raise PermissionError("Refund denied")
            action = final
        
        # Execute if allowed
        if action['status'] not in ('allowed', 'approved'):
            raise PermissionError("Refund not approved")
        
        # Perform refund
        start_action(action['id'])
        try:
            # Your refund logic
            result = {"refund_id": "ref_123"}
            return result
        except Exception as e:
            raise

# Usage
service = GovernedRefundService()
result = service.refund(150.0, "cust_123")
```

### Pattern 3: Context Manager

```python
from contextlib import contextmanager
from faramesh import configure, submit_action, wait_for_completion, start_action

configure(base_url="http://127.0.0.1:8000")

@contextmanager
def governed_action(tool: str, operation: str, params: dict, agent_id: str = "default-agent"):
    """Context manager for governed actions."""
    # Submit action
    action = submit_action(
        agent_id=agent_id,
        tool=tool,
        operation=operation,
        params=params
    )
    
    # Wait for approval if needed
    if action['status'] == 'pending_approval':
        final = wait_for_completion(action['id'], timeout=300.0)
        if final['status'] == 'denied':
            raise PermissionError("Action denied")
        action = final
    
    # Check if allowed
    if action['status'] not in ('allowed', 'approved'):
        raise PermissionError(f"Action not approved: {action['status']}")
    
    # Start execution
    start_action(action['id'])
    
    try:
        yield action
        # Report success (via API)
    except Exception as e:
        # Report failure (via API)
        raise

# Usage
with governed_action("refund", "process", {"amount": 150, "customer_id": "cust_123"}) as action:
    # Perform refund
    result = perform_refund(action['params'])
```

---

## Using cURL (No SDK)

If you prefer cURL or don't have the SDK available:

```bash
#!/bin/bash

# 1. Submit action
ACTION_RESPONSE=$(curl -X POST http://127.0.0.1:8000/v1/actions \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "billing-bot",
    "tool": "refund",
    "operation": "process",
    "params": {"amount": 150, "customer_id": "cust_123"}
  }')

# Extract action ID and status
ACTION_ID=$(echo $ACTION_RESPONSE | jq -r '.id')
STATUS=$(echo $ACTION_RESPONSE | jq -r '.status')

# 2. Check status
if [ "$STATUS" = "denied" ]; then
  echo "Action denied"
  exit 1
fi

if [ "$STATUS" = "pending_approval" ]; then
  echo "Action requires approval. ID: $ACTION_ID"
  echo "Open http://127.0.0.1:8000 to approve"
  # Poll for approval...
  while true; do
    sleep 2
    UPDATED=$(curl -s http://127.0.0.1:8000/v1/actions/$ACTION_ID)
    NEW_STATUS=$(echo $UPDATED | jq -r '.status')
    if [ "$NEW_STATUS" = "approved" ]; then
      break
    elif [ "$NEW_STATUS" = "denied" ]; then
      echo "Action denied"
      exit 1
    fi
  done
fi

# 3. Execute if allowed
if [ "$STATUS" = "allowed" ] || [ "$STATUS" = "approved" ]; then
  # Start execution
  curl -X POST http://127.0.0.1:8000/v1/actions/$ACTION_ID/start \
    -H "Content-Type: application/json"
  
  # Your refund logic here
  echo "Processing refund..."
  
  # 4. Report result
  curl -X POST http://127.0.0.1:8000/v1/actions/$ACTION_ID/result \
    -H "Content-Type: application/json" \
    -d '{"success": true}'
fi
```

---

## Using the `governed_tool` Decorator

Faramesh provides a built-in decorator for simple cases:

```python
from faramesh import configure, governed_tool

configure(base_url="http://127.0.0.1:8000")

@governed_tool(agent_id="my-agent", tool="shell", operation="run")
def execute_command(cmd: str) -> str:
    """Execute a shell command with Faramesh governance."""
    import subprocess
    result = subprocess.run(cmd, shell=True, capture_output=True)
    return result.stdout.decode()

# Use the governed function
output = execute_command("echo hello")
# Function automatically submits to Faramesh, waits for approval, executes, and reports result
```

---

## Best Practices

### 1. Always Check Status

Never execute without checking the action status:

```python
if action['status'] not in ('allowed', 'approved'):
    raise PermissionError("Action not approved")
```

### 2. Handle Pending Approval

Choose one approach:
- **Wait and poll**: Use `wait_for_completion()` with timeout
- **Exit with message**: Raise error with action ID for manual approval

### 3. Report Results

Always report results (success or failure):

```python
try:
    result = perform_action()
    client.report_result(action_id, success=True, error=None)
    return result
except Exception as e:
    client.report_result(action_id, success=False, error=str(e))
    raise
```

### 4. Use Descriptive Tool/Operation Names

Help with policy matching:

```python
# Good
submit_action(..., tool="refund", operation="process")

# Less clear
submit_action(..., tool="api", operation="call")
```

### 5. Include Context

Add metadata for better auditing:

```python
submit_action(
    ...,
    context={
        "agent_id": "billing-bot",
        "function": "refund_customer",
        "environment": "production",
        "user": "alice"
    }
)
```

### 6. Set Timeouts

Don't wait forever for approval:

```python
final = wait_for_completion(action_id, timeout=300.0)  # 5 minutes
```

### 7. Handle Errors Gracefully

```python
try:
    action = submit_action(...)
except FarameshConnectionError:
    # Handle connection error (maybe fail-open or fail-closed)
    pass
except FarameshError as e:
    # Handle other Faramesh errors
    print(f"Error: {e}")
```

---

## Advanced: Custom Tool Classes

For more complex tools, create a custom class:

```python
from faramesh import configure, submit_action, wait_for_completion, start_action

configure(base_url="http://127.0.0.1:8000")

class GovernedPaymentTool:
    def __init__(self, agent_id: str = "payment-bot"):
        self.agent_id = agent_id
    
    def refund(self, amount: float, customer_id: str):
        action = submit_action(
            agent_id=self.agent_id,
            tool="payment",
            operation="refund",
            params={"amount": amount, "customer_id": customer_id}
        )
        
        if action['status'] == 'pending_approval':
            final = wait_for_completion(action['id'], timeout=300.0)
            if final['status'] == 'denied':
                raise PermissionError("Refund denied")
            action = final
        
        if action['status'] not in ('allowed', 'approved'):
            raise PermissionError("Refund not approved")
        
        start_action(action['id'])
        # Perform refund
        return {"refund_id": "ref_123"}
    
    def charge(self, amount: float, customer_id: str):
        # Similar pattern for charge operation
        pass
```

---

## Next Steps

- See [Policy Packs](POLICY_PACKS.md) for ready-to-use policies
- Check [Framework Integrations](INTEGRATIONS.md) for framework-specific patterns
- Read [SDK Python](SDK-Python.md) for full SDK reference
- Review [Policy Configuration](POLICIES.md) for policy examples
