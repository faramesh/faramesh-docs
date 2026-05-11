# Error Handling

Faramesh provides comprehensive error handling with clear, actionable error messages and proper HTTP status codes.

## HTTP Status Codes

Faramesh uses standard HTTP status codes to indicate different types of errors:

| Status Code | Meaning | When It Occurs |
|-------------|---------|----------------|
| `400 Bad Request` | Invalid request | Missing required fields, invalid action state, etc. |
| `401 Unauthorized` | Authentication required | Missing or invalid authentication token |
| `403 Forbidden` | Insufficient permissions | Invalid approval token, etc. |
| `404 Not Found` | Resource not found | Action ID doesn't exist, etc. |
| `409 Conflict` | State conflict | Trying to approve an already-approved action, etc. |
| `422 Unprocessable Entity` | Validation error | Invalid JSON, invalid parameter values, etc. |
| `500 Internal Server Error` | Server error | Unexpected server errors |

## Error Response Format

All error responses follow this format:

```json
{
  "detail": "Human-readable error message with actionable guidance"
}
```

Some errors may include additional fields:

```json
{
  "detail": "Error message",
  "error_type": "ExceptionClassName",
  "error_code": "ERROR_CODE"
}
```

## Error Types

### 400 Bad Request

**Action Not Executable**

Occurs when trying to execute an action that cannot be executed in its current state.

**Example:**
```json
{
  "detail": "Action 2755d4a8... cannot be executed: Action requires human approval before execution. Use the /approval endpoint to approve or deny."
}
```

**Common Causes:**
- Action is in `pending_approval` status
- Action is in `denied` status
- Action is already `executing`, `succeeded`, or `failed`

**Resolution:**
- For `pending_approval`: Approve or deny the action first
- For `denied`: Action cannot be executed (use `replay` to create a new action)
- For `executing`: Wait for the current execution to complete
- For `succeeded`/`failed`: Use `replay` to create a new action with the same parameters

---

### 401 Unauthorized

**Missing or Invalid Authentication**

Occurs when authentication is required but missing or invalid.

**Example:**
```json
{
  "detail": "Authentication required. Include a valid Authorization header: 'Authorization: Bearer <token>'. Contact your administrator for an API token."
}
```

**Common Causes:**
- Missing `Authorization` header
- Invalid or expired token
- Server requires authentication but none provided

**Resolution:**
1. Check if server requires authentication (`FARAMESH_TOKEN` environment variable)
2. Include `Authorization: Bearer <token>` header in requests
3. Verify token is correct and not expired
4. Contact administrator for a valid token

---

### 403 Forbidden

**Insufficient Permissions**

Occurs when authentication is valid but the operation is not permitted.

**Example:**
```json
{
  "detail": "Invalid approval token"
}
```

**Common Causes:**
- Invalid approval token when approving/denying actions
- Token doesn't have required permissions

**Resolution:**
- Use the correct approval token from the action's `approval_token` field
- Ensure token has required permissions

---

### 404 Not Found

**Resource Not Found**

Occurs when requesting a resource that doesn't exist.

**Example:**
```json
{
  "detail": "Action '2755d4a8...' not found. Check that the action ID is correct. Use the /v1/actions endpoint to list all actions."
}
```

**Common Causes:**
- Invalid action ID
- Action was deleted
- Typo in action ID

**Resolution:**
1. Verify action ID is correct (use `faramesh list` or `GET /v1/actions`)
2. Check if using prefix matching (use full UUID if ambiguous)
3. Verify action exists in the database

---

### 409 Conflict

**State Conflict**

Occurs when trying to perform an operation that conflicts with the current state.

**Example:**
```json
{
  "detail": "Action is not in pending_approval status"
}
```

**Common Causes:**
- Trying to approve an action that's already approved/denied
- Trying to start an action that's already executing
- Concurrent modification conflicts

**Resolution:**
1. Check current action status: `GET /v1/actions/{id}`
2. Only perform operations valid for current status
3. For concurrent conflicts, retry the operation

---

### 422 Unprocessable Entity

**Validation Error**

Occurs when request data fails validation.

**Example:**
```json
{
  "detail": "Invalid JSON in params field. Please check the 'params' field and ensure it meets the requirements."
}
```

**Common Causes:**
- Invalid JSON syntax
- Missing required fields
- Invalid parameter values
- Type mismatches

**Resolution:**
1. Check error message for specific field that failed
2. Verify JSON syntax is valid
3. Ensure all required fields are present
4. Check parameter types match expected types
5. Review API documentation for expected format

**Common Validation Errors:**

- **Missing required field:**
  ```json
  {
    "detail": "Missing required field: tool. Please check the 'tool' field and ensure it meets the requirements."
  }
  ```

- **Invalid JSON:**
  ```json
  {
    "detail": "Invalid JSON in params field. Please check your input and try again."
  }
  ```

- **Invalid parameter value:**
  ```json
  {
    "detail": "Invalid value for 'amount': must be a positive number. Please check the 'amount' field and ensure it meets the requirements."
  }
  ```

---

### 500 Internal Server Error

**Unexpected Server Error**

Occurs when an unexpected error occurs on the server.

**Example:**
```json
{
  "detail": "Internal server error: <error message>",
  "error_type": "ExceptionClassName"
}
```

**Common Causes:**
- Database connection errors
- Policy file parsing errors
- Unexpected exceptions in code

**Resolution:**
1. Check server logs for detailed error information
2. Verify database is accessible and healthy
3. Check policy file syntax
4. Report issue with error details if it persists

**Note:** Faramesh includes global exception handling to prevent server crashes. Errors are logged and returned as proper HTTP responses.

---

## Error Codes

Faramesh uses standard error codes for programmatic error handling:

| Error Code | Description |
|------------|-------------|
| `ACTION_NOT_FOUND` | Action with given ID not found |
| `ACTION_NOT_EXECUTABLE` | Action cannot be executed in current state |
| `ACTION_REQUIRES_APPROVAL` | Action requires approval before execution |
| `UNAUTHORIZED` | Authentication required or invalid |
| `VALIDATION_ERROR` | Request validation failed |
| `INTERNAL_ERROR` | Unexpected server error |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable |

---

## SDK Error Handling

### Python SDK

The Python SDK provides typed exception classes:

```python
from faramesh import submit_action, FarameshError, FarameshAuthError, FarameshNotFoundError

try:
    action = submit_action("agent", "shell", "run", {"cmd": "echo hello"})
except FarameshAuthError as e:
    print(f"Authentication error: {e}")
except FarameshNotFoundError as e:
    print(f"Not found: {e}")
except FarameshError as e:
    print(f"Error: {e}")
```

**Exception Classes:**
- `FarameshError` - Base exception
- `FarameshAuthError` - Authentication errors (401)
- `FarameshNotFoundError` - Not found errors (404)
- `FarameshValidationError` - Validation errors (422)
- `FarameshServerError` - Server errors (500)
- `FarameshConnectionError` - Connection errors
- `FarameshTimeoutError` - Timeout errors

### Node.js SDK

The Node.js SDK provides similar error classes:

```javascript
const { submitAction, FarameshError, FarameshAuthError } = require('@faramesh/sdk');

try {
  const action = await submitAction({...});
} catch (error) {
  if (error instanceof FarameshAuthError) {
    console.error('Authentication error:', error.message);
  } else if (error instanceof FarameshError) {
    console.error('Error:', error.message);
  }
}
```

---

## Best Practices

### 1. Always Check Status Codes

```python
response = requests.post("http://127.0.0.1:8000/v1/actions", json={...})
if response.status_code == 401:
    print("Authentication required")
elif response.status_code == 422:
    print("Validation error:", response.json()["detail"])
```

### 2. Use SDK Exception Handling

SDKs provide typed exceptions that make error handling easier:

```python
try:
    action = submit_action(...)
except FarameshAuthError:
    # Handle auth error
except FarameshValidationError as e:
    # Handle validation error with field details
except FarameshError as e:
    # Handle other errors
```

### 3. Provide Actionable Error Messages

Faramesh error messages are designed to be actionable. Always read the `detail` field:

```json
{
  "detail": "Action requires human approval before execution. Use the /approval endpoint to approve or deny."
}
```

### 4. Handle Retryable Errors

Some errors are retryable (e.g., `500 Internal Server Error`, `409 Conflict`):

```python
import time
from faramesh import submit_action, FarameshServerError

max_retries = 3
for attempt in range(max_retries):
    try:
        action = submit_action(...)
        break
    except FarameshServerError:
        if attempt < max_retries - 1:
            time.sleep(2 ** attempt)  # Exponential backoff
        else:
            raise
```

### 5. Log Errors for Debugging

Always log error details for debugging:

```python
import logging

try:
    action = submit_action(...)
except FarameshError as e:
    logging.error(f"Faramesh error: {e}", exc_info=True)
    raise
```

---

## Common Error Scenarios

### Scenario 1: Action Requires Approval

**Error:**
```json
{
  "detail": "Action 2755d4a8... cannot be executed: Action requires human approval before execution."
}
```

**Solution:**
```bash
# Approve the action
faramesh approve 2755d4a8

# Or via API
curl -X POST http://127.0.0.1:8000/v1/actions/2755d4a8-.../approval \
  -H "Content-Type: application/json" \
  -d '{"token": "...", "approve": true}'
```

### Scenario 2: Invalid JSON

**Error:**
```json
{
  "detail": "Invalid JSON in params field. Please check your input and try again."
}
```

**Solution:**
```python
# Ensure params is valid JSON
import json

params = {"cmd": "echo hello"}  # Valid dict
params_json = json.dumps(params)  # Valid JSON string

# Use in request
action = submit_action("agent", "shell", "run", params)
```

### Scenario 3: Authentication Required

**Error:**
```json
{
  "detail": "Authentication required. Include a valid Authorization header..."
}
```

**Solution:**
```bash
# Set token environment variable
export FARAMESH_TOKEN=my-token

# Or use --token flag
faramesh --token my-token list

# Or in Python
from faramesh import configure
configure(token="my-token")
```

---

## See Also

- [API Reference](API.md) - Complete API documentation
- [CLI Reference](CLI.md) - Command-line interface
- [Troubleshooting](Troubleshooting.md) - Common issues and fixes
- [Security Guardrails](SECURITY-GUARDRAILS.md) - Security mechanisms
