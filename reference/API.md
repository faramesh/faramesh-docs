# Faramesh REST API Reference

Complete reference for all Faramesh API endpoints. All endpoints are served under the base URL (default `http://127.0.0.1:8000`).

## Authentication

If authentication is enabled (via `FARAMESH_TOKEN` environment variable), all `/v1/*` endpoints require a Bearer token:

```http
Authorization: Bearer <token>
```

If `FARAMESH_TOKEN` is not set, the API operates without authentication (trusted internal service mode).

## Base Endpoints

### `GET /health`

Lightweight liveness probe. Returns `200 OK` if the server process is running.

**Response:**
```json
{
  "status": "healthy"
}
```

**Example:**
```bash
curl http://127.0.0.1:8000/health
```

---

### `GET /ready`

Readiness probe. Returns `200 OK` if the server and database are ready to serve requests.

**Response:**
```json
{
  "status": "ready"
}
```

**Example:**
```bash
curl http://127.0.0.1:8000/ready
```

---

### `GET /metrics`

Prometheus metrics endpoint. Returns metrics in Prometheus text format.

**Response:** Prometheus text format

**Example:**
```bash
curl http://127.0.0.1:8000/metrics
```

**Metrics include:**
- `faramesh_requests_total{method,endpoint,status}` - Total HTTP requests
- `faramesh_errors_total{error_type}` - Total errors by type
- `faramesh_actions_total{status,tool}` - Total actions by status and tool
- `faramesh_action_duration_seconds_bucket{...}` - Action execution duration histogram

See [Observability](OBSERVABILITY.md) for detailed metrics documentation.

---

### `GET /v1/policy/info`

Get information about the active policy file.

**Response:**
```json
{
  "policy_file": "policies/default.yaml",
  "policy_path": "/path/to/policies/default.yaml",
  "exists": true,
  "policy_version": "yaml"
}
```

**Example:**
```bash
curl http://127.0.0.1:8000/v1/policy/info
```

---

## Action Endpoints

### `POST /v1/actions`

Submit a new action for governance evaluation.

**Request Body:**
```json
{
  "agent_id": "string",
  "tool": "string",
  "operation": "string",
  "params": {},
  "context": {}
}
```

**Request Fields:**
- `agent_id` (required): Identifier for the agent making the request
- `tool` (required): Tool name (e.g., "shell", "http", "stripe")
- `operation` (required): Operation name (e.g., "run", "get", "refund")
- `params` (required): Tool-specific parameters as a JSON object
- `context` (optional): Additional metadata as a JSON object

**Response:**
```json
{
  "id": "uuid",
  "agent_id": "string",
  "tool": "string",
  "operation": "string",
  "params": {},
  "context": {},
  "status": "allowed | pending_approval | denied | executing | succeeded | failed",
  "decision": "allow | deny | require_approval",
  "reason": "string or null",
  "risk_level": "low | medium | high",
  "approval_token": "string or null",
  "policy_version": "string",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601",
  "js_example": "string or null",
  "python_example": "string or null"
}
```

**Status Values:**
- `allowed`: Action was allowed by policy and can be executed immediately
- `pending_approval`: Action requires human approval before execution
- `denied`: Action was denied by policy and cannot be executed
- `executing`: Action is currently being executed
- `succeeded`: Action completed successfully
- `failed`: Action execution failed

**Example:**
```bash
curl -X POST http://127.0.0.1:8000/v1/actions \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "my-agent",
    "tool": "shell",
    "operation": "run",
    "params": {"cmd": "echo hello"},
    "context": {"user": "alice"}
  }'
```

**Error Responses:**
- `400 Bad Request`: Invalid request body or missing required fields
- `401 Unauthorized`: Missing or invalid authentication token
- `422 Unprocessable Entity`: Validation error (e.g., invalid JSON)

---

### `GET /v1/actions/{action_id}`

Get the latest state of a specific action.

**Path Parameters:**
- `action_id` (required): Action UUID

**Response:** Same as `POST /v1/actions` response

**Example:**
```bash
curl http://127.0.0.1:8000/v1/actions/2755d4a8-1000-47e6-873c-b9fd535234ad
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Action not found

---

### `GET /v1/actions`

List actions with optional filters and pagination.

**Query Parameters:**
- `limit` (optional, default: 20): Maximum number of actions to return
- `offset` (optional, default: 0): Pagination offset
- `agent_id` (optional): Filter by agent ID
- `tool` (optional): Filter by tool name
- `status` (optional): Filter by status (allowed, pending_approval, denied, executing, succeeded, failed)

**Response:**
```json
[
  {
    "id": "uuid",
    "agent_id": "string",
    "tool": "string",
    "operation": "string",
    "params": {},
    "context": {},
    "status": "string",
    "decision": "string",
    "reason": "string or null",
    "risk_level": "string",
    "created_at": "ISO-8601",
    "updated_at": "ISO-8601"
  }
]
```

**Example:**
```bash
# List all actions
curl http://127.0.0.1:8000/v1/actions

# List with filters
curl "http://127.0.0.1:8000/v1/actions?status=pending_approval&tool=shell&limit=10"

# Pagination
curl "http://127.0.0.1:8000/v1/actions?limit=20&offset=40"
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token
- `422 Unprocessable Entity`: Invalid query parameter

---

### `GET /v1/actions/{action_id}/events`

Get the complete event timeline for an action.

**Path Parameters:**
- `action_id` (required): Action UUID

**Response:**
```json
[
  {
    "id": "uuid",
    "action_id": "uuid",
    "event_type": "created | decision_made | approved | denied | started | succeeded | failed",
    "meta": {},
    "created_at": "ISO-8601"
  }
]
```

**Event Types:**
- `created`: Action was created
- `decision_made`: Policy evaluation completed
- `approved`: Human approved the action
- `denied`: Human denied the action
- `started`: Execution began
- `succeeded`: Execution completed successfully
- `failed`: Execution failed

**Example:**
```bash
curl http://127.0.0.1:8000/v1/actions/2755d4a8-1000-47e6-873c-b9fd535234ad/events
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Action not found

---

### `POST /v1/actions/{action_id}/approval`

Approve or deny a pending-approval action.

**Path Parameters:**
- `action_id` (required): Action UUID

**Request Body:**
```json
{
  "token": "approval_token",
  "approve": true,
  "reason": "optional reason"
}
```

**Request Fields:**
- `token` (required): Approval token from the action's `approval_token` field
- `approve` (required): `true` to approve, `false` to deny
- `reason` (optional): Human-readable reason for approval/denial

**Response:** Updated action object (same as `GET /v1/actions/{action_id}`)

**Example:**
```bash
# Approve action
curl -X POST http://127.0.0.1:8000/v1/actions/2755d4a8-.../approval \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123...",
    "approve": true,
    "reason": "Looks safe"
  }'

# Deny action
curl -X POST http://127.0.0.1:8000/v1/actions/2755d4a8-.../approval \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123...",
    "approve": false,
    "reason": "Too risky"
  }'
```

**Error Responses:**
- `400 Bad Request`: Invalid request body or missing required fields
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Invalid approval token
- `404 Not Found`: Action not found
- `409 Conflict`: Action is not in `pending_approval` status

---

### `POST /v1/actions/{action_id}/start`

Mark an action as started (used by executors/workers when beginning execution).

**Path Parameters:**
- `action_id` (required): Action UUID

**Request Body:** Optional executor metadata
```json
{
  "executor_id": "string",
  "started_at": "ISO-8601"
}
```

**Response:** Updated action object

**Example:**
```bash
curl -X POST http://127.0.0.1:8000/v1/actions/2755d4a8-.../start \
  -H "Content-Type: application/json" \
  -d '{
    "executor_id": "worker-1"
  }'
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Action not found
- `409 Conflict`: Action is not in a state that can be started

---

### `POST /v1/actions/{action_id}/result`

Report execution result for an action.

**Path Parameters:**
- `action_id` (required): Action UUID

**Request Body:**
```json
{
  "success": true,
  "error": "optional error message",
  "meta": {}
}
```

**Request Fields:**
- `success` (required): `true` if execution succeeded, `false` if it failed
- `error` (optional): Error message if execution failed
- `meta` (optional): Additional metadata about the execution result

**Response:** Updated action object

**Example:**
```bash
# Report success
curl -X POST http://127.0.0.1:8000/v1/actions/2755d4a8-.../result \
  -H "Content-Type: application/json" \
  -d '{
    "success": true,
    "meta": {"exit_code": 0, "stdout": "hello"}
  }'

# Report failure
curl -X POST http://127.0.0.1:8000/v1/actions/2755d4a8-.../result \
  -H "Content-Type: application/json" \
  -d '{
    "success": false,
    "error": "Command failed with exit code 1"
  }'
```

**Error Responses:**
- `400 Bad Request`: Invalid request body
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Action not found
- `409 Conflict`: Action is not in a state that can receive results

---

## Server-Sent Events

### `GET /v1/events`

Stream of real-time action updates via Server-Sent Events (SSE).

**Headers:**
- `Accept: text/event-stream` (required)

**Response:** SSE stream with events in the format:
```
data: {"action_id": "uuid", "event_type": "created", ...}

data: {"action_id": "uuid", "event_type": "approved", ...}
```

Each `data:` line contains a JSON object with action update information.

**Example:**
```bash
curl -N -H "Accept: text/event-stream" http://127.0.0.1:8000/v1/events
```

**Note:** If authentication is enabled, include the Bearer token:
```bash
curl -N -H "Accept: text/event-stream" \
  -H "Authorization: Bearer <token>" \
  http://127.0.0.1:8000/v1/events
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token

---

## Playground Endpoints

### `GET /playground`

Interactive policy playground page for testing policy decisions without creating real actions.

**Response:** HTML page

**Example:**
```bash
open http://127.0.0.1:8000/playground
```

---

### `POST /playground/eval`

Evaluate a policy decision for an action without creating the action (for testing).

**Request Body:**
```json
{
  "agent_id": "string",
  "tool": "string",
  "operation": "string",
  "params": {},
  "context": {}
}
```

**Response:**
```json
{
  "status": "allowed | denied | pending_approval",
  "decision": "allow | deny | require_approval",
  "reason": "string",
  "risk_level": "low | medium | high",
  "agent_id": "string",
  "tool": "string",
  "operation": "string"
}
```

**Example:**
```bash
curl -X POST http://127.0.0.1:8000/playground/eval \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test-agent",
    "tool": "shell",
    "operation": "run",
    "params": {"cmd": "echo hello"}
  }'
```

**Note:** This endpoint does not create actions or modify state. It's purely for policy testing.

---

## Error Responses

All endpoints may return the following error responses:

### `400 Bad Request`
Invalid request body or missing required fields.

```json
{
  "detail": "Missing required field: tool"
}
```

### `401 Unauthorized`
Missing or invalid authentication token.

```json
{
  "detail": "Unauthorized"
}
```

### `403 Forbidden`
Valid authentication but insufficient permissions (e.g., invalid approval token).

```json
{
  "detail": "Invalid approval token"
}
```

### `404 Not Found`
Resource not found (e.g., action ID doesn't exist).

```json
{
  "detail": "Action not found"
}
```

### `409 Conflict`
Resource state conflict (e.g., trying to approve an action that's already approved).

```json
{
  "detail": "Action is not in pending_approval status"
}
```

### `422 Unprocessable Entity`
Validation error (e.g., invalid JSON, invalid parameter value).

```json
{
  "detail": "Invalid JSON in params field"
}
```

### `500 Internal Server Error`
Unexpected server error.

```json
{
  "detail": "Internal server error: <error message>",
  "error_type": "ExceptionClassName"
}
```

---

## Rate Limiting

Currently, Faramesh does not implement rate limiting. For production deployments, consider using a reverse proxy (e.g., nginx) or API gateway for rate limiting.

---

## SDKs

The Faramesh Python and Node.js SDKs provide convenient wrappers around these endpoints:

- **Python SDK**: See [SDK-Python.md](SDK-Python.md)
- **Node.js SDK**: See [SDK-Node.md](SDK-Node.md)

---

## See Also

- [CLI Reference](CLI.md) - Command-line interface for interacting with Faramesh
- [Error Handling](ERROR-HANDLING.md) - Detailed error handling guide
- [Observability](OBSERVABILITY.md) - Metrics and monitoring
- [Quick Start](../QUICKSTART.md) - Getting started guide
