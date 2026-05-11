# Govern Your Own Tool

This tutorial shows you how to wrap your own custom tools with Faramesh governance. You'll learn to integrate Faramesh into any function or tool that performs actions.

## Overview

The pattern is simple:
1. **Define your tool** (function, class, or API call)
2. **Submit action to Faramesh** before execution
3. **Check status** (allow/deny/pending)
4. **Execute only if allowed**
5. **Report result** back to Faramesh

## Example: Refund Function

Let's create a simple refund function and wrap it with Faramesh:

```python
from faramesh.sdk.client import ExecutionGovernorClient

# Initialize Faramesh client
client = ExecutionGovernorClient("http://127.0.0.1:8000")

def refund_customer(amount: float, customer_id: str) -> dict:
    """
    Refund a customer - wrapped with Faramesh governance.
    """
    # 1. Submit action to Faramesh
    action = client.submit_action(
        tool="refund",
        operation="process",
        params={
            "amount": amount,
            "customer_id": customer_id,
        },
        context={
            "agent_id": "billing-bot",
            "function": "refund_customer",
        },
    )
    
    action_id = action['id']
    status = action['status']
    decision = action.get('decision', '')
    
    # 2. Check status
    if decision == 'deny' or status == 'denied':
        reason = action.get('reason', 'Action denied by policy')
        raise PermissionError(f"Refund denied: {reason}")
    
    if status == 'pending_approval':
        # Wait for approval (or exit with message)
        print(f"Refund requires approval. Action ID: {action_id}")
        print(f"Open http://127.0.0.1:8000 to approve/deny")
        # Option 1: Wait and poll
        import time
        max_wait = 300  # 5 minutes
        start = time.time()
        while time.time() - start < max_wait:
            time.sleep(2)
            updated = client.get_action(action_id)
            if updated['status'] in ('approved', 'allowed'):
                break
            elif updated['status'] == 'denied':
                raise PermissionError("Refund was denied")
        else:
            raise TimeoutError("Refund approval timeout")
        
        # Option 2: Exit and let user approve manually
        # raise PermissionError(f"Refund pending approval: {action_id}")
    
    # 3. Execute only if allowed/approved
    if status not in ('allowed', 'approved'):
        raise PermissionError(f"Refund not approved. Status: {status}")
    
    # 4. Perform the actual refund
    try:
        # Your actual refund logic here
        result = {
            "success": True,
            "refund_id": f"ref_{action_id[:8]}",
            "amount": amount,
            "customer_id": customer_id,
        }
        
        # 5. Report result to Faramesh
        client.report_result(action_id, success=True, result=result)
        return result
        
    except Exception as e:
        # Report failure
        client.report_result(action_id, success=False, error=str(e))
        raise
```

## Example: Delete User Function

Here's another example with a delete operation:

```python
def delete_user(user_id: str) -> bool:
    """
    Delete a user - requires approval for safety.
    """
    client = ExecutionGovernorClient("http://127.0.0.1:8000")
    
    # Submit to Faramesh
    action = client.submit_action(
        tool="user_management",
        operation="delete",
        params={"user_id": user_id},
        context={"agent_id": "admin-bot"},
    )
    
    # Check decision
    if action['status'] == 'denied':
        raise PermissionError(f"Delete denied: {action.get('reason')}")
    
    if action['status'] == 'pending_approval':
        print(f"Delete requires approval: {action['id']}")
        # Wait for approval...
        # (same polling logic as above)
    
    # Execute if allowed
    if action['status'] not in ('allowed', 'approved'):
        raise PermissionError("Delete not approved")
    
    # Perform deletion
    try:
        # Your deletion logic
        success = True
        client.report_result(action['id'], success=success)
        return success
    except Exception as e:
        client.report_result(action['id'], success=False, error=str(e))
        raise
```

## Policy Example

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

## Using cURL (No SDK)

If you prefer cURL or don't have the SDK available:

```bash
# 1. Submit action
ACTION_RESPONSE=$(curl -X POST http://127.0.0.1:8000/v1/actions \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "refund",
    "operation": "process",
    "params": {"amount": 150, "customer_id": "cust_123"},
    "context": {"agent_id": "billing-bot"}
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
fi

# 3. Execute if allowed
if [ "$STATUS" = "allowed" ] || [ "$STATUS" = "approved" ]; then
  # Your refund logic here
  echo "Processing refund..."
  
  # 4. Report result
  curl -X POST http://127.0.0.1:8000/v1/actions/$ACTION_ID/result \
    -H "Content-Type: application/json" \
    -d '{"success": true, "result": {"refund_id": "ref_123"}}'
fi
```

## Best Practices

1. **Always check status** before executing
2. **Handle pending approval** - either wait and poll, or exit with clear message
3. **Report results** - call `report_result()` in both success and failure cases
4. **Use descriptive tool/operation names** - helps with policy matching
5. **Include context** - add `agent_id`, `function`, or other metadata
6. **Set timeouts** - don't wait forever for approval

## Integration Patterns

### Pattern 1: Decorator

```python
from functools import wraps

def governed_action(tool: str, operation: str):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            client = ExecutionGovernorClient("http://127.0.0.1:8000")
            # Submit, check, execute, report
            # ... (same pattern as above)
        return wrapper
    return decorator

@governed_action(tool="refund", operation="process")
def refund(amount: float, customer_id: str):
    # Your refund logic
    pass
```

### Pattern 2: Class Wrapper

```python
class GovernedRefundService:
    def __init__(self):
        self.client = ExecutionGovernorClient("http://127.0.0.1:8000")
    
    def refund(self, amount: float, customer_id: str):
        # Submit, check, execute, report
        # ... (same pattern)
        pass
```

### Pattern 3: Context Manager

```python
class GovernedAction:
    def __init__(self, tool: str, operation: str, params: dict):
        self.client = ExecutionGovernorClient("http://127.0.0.1:8000")
        self.action = self.client.submit_action(...)
        # ...
    
    def __enter__(self):
        if self.action['status'] not in ('allowed', 'approved'):
            raise PermissionError("Action not approved")
        return self
    
    def __exit__(self, *args):
        self.client.report_result(...)

# Usage
with GovernedAction("refund", "process", {...}) as action:
    # Execute refund
    pass
```

## Next Steps

- See [Policy Packs](../../policies/packs/) for ready-to-use policies
- Check [LangChain Integration](./LangChain%20integration.md) for framework integration
- Read [SDK Python](./SDK-Python.md) for full SDK reference
