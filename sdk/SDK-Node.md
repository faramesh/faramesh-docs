# Node.js SDK

The Faramesh Node.js SDK provides a production-ready TypeScript/JavaScript client for integrating AI agents with Faramesh governance.

## Installation

```bash
npm install @faramesh/sdk
# or
yarn add @faramesh/sdk
# or
pnpm add @faramesh/sdk
```

---

## Quick Start

### TypeScript

```typescript
import { configure, submitAction, getAction } from "@faramesh/sdk";

configure({
  baseUrl: "http://127.0.0.1:8000",
  token: "dev-token",
});

const action = await submitAction(
  "my-agent",
  "http",
  "get",
  { url: "https://example.com" }
);

console.log(`Action ${action.id} status: ${action.status}`);
console.log(`Risk Level: ${action.risk_level}`);
```

### JavaScript

```javascript
const { configure, submitAction } = require("@faramesh/sdk");

configure({
  baseUrl: "http://127.0.0.1:8000",
  token: "dev-token",
});

(async () => {
  const action = await submitAction(
    "my-agent",
    "http",
    "get",
    { url: "https://example.com" }
  );
  console.log(`Action ${action.id} status: ${action.status}`);
})();
```

---

## Configuration

### Global Configuration

Use `configure()` to set global configuration:

```typescript
import { configure } from "@faramesh/sdk";

configure({
  baseUrl: "http://127.0.0.1:8000",
  token: "dev-token",
  timeoutMs: 30000,
  maxRetries: 3,
  retryBackoffFactor: 0.5,
});
```

### ClientConfig Interface

```typescript
interface ClientConfig {
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryBackoffFactor?: number;
  onRequestStart?: (method: string, url: string) => void;
  onRequestEnd?: (method: string, url: string, statusCode: number, durationMs: number) => void;
  onError?: (error: Error) => void;
}
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
```typescript
import { submitAction } from "@faramesh/sdk";

const action = await submitAction(
  "my-agent",
  "shell",
  "run",
  { cmd: "echo hello" },
  { user: "alice" }  // optional context
);
```

**Type Definitions:**
```typescript
submitAction(
  agentId: string,
  tool: string,
  operation: string,
  params?: Record<string, any>,
  context?: Record<string, any>
): Promise<Action>
```

### Getting Actions

**Get Single Action:**
```typescript
import { getAction } from "@faramesh/sdk";

const action = await getAction("2755d4a8-1000-47e6-873c-b9fd535234ad");
```

**List Actions:**
```typescript
import { listActions } from "@faramesh/sdk";

// List all actions
const actions = await listActions();

// With filters
const actions = await listActions({
  limit: 50,
  status: "pending_approval",
  tool: "shell",
  agentId: "my-agent",
});
```

**ListActionsOptions:**
```typescript
interface ListActionsOptions {
  limit?: number;
  offset?: number;
  status?: string;
  tool?: string;
  agentId?: string;
}
```

### Approval Workflow

**Approve Action:**
```typescript
import { approveAction } from "@faramesh/sdk";

const result = await approveAction(
  "2755d4a8-...",
  "approval-token",  // From action.approval_token
  "Looks safe"       // Optional reason
);
```

**Deny Action:**
```typescript
import { denyAction } from "@faramesh/sdk";

const result = await denyAction(
  "2755d4a8-...",
  "approval-token",
  "Too risky"  // Optional reason
);
```

**Wait for Approval:**
```typescript
import { waitForCompletion } from "@faramesh/sdk";

// Wait until action is approved or denied
const final = await waitForCompletion("2755d4a8-...", {
  timeoutMs: 300000,  // 5 minutes
});
```

### Execution

**Start Action:**
```typescript
import { startAction } from "@faramesh/sdk";

const result = await startAction("2755d4a8-...");
```

**Wait for Completion:**
```typescript
import { waitForCompletion } from "@faramesh/sdk";

const final = await waitForCompletion("2755d4a8-...", {
  timeoutMs: 300000,
  pollIntervalMs: 2000,  // Poll every 2 seconds
});
```

**Replay Action:**
```typescript
import { replayAction } from "@faramesh/sdk";

// Create new action with same parameters
const newAction = await replayAction("2755d4a8-...");
```

### File-Based Operations

**Apply Action from File:**
```typescript
import { apply } from "@faramesh/sdk";

// Submit action from YAML or JSON file
const action = await apply("examples/file_apply.yaml");
const action2 = await apply("examples/http_action.json");
```

---

## Error Handling

### Exception Classes

All SDK errors derive from `FarameshError`:

```typescript
import {
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
} from "@faramesh/sdk";
```

### Error Handling Example

```typescript
import { submitAction, FarameshAuthError, FarameshPolicyError } from "@faramesh/sdk";

try {
  const action = await submitAction("agent", "shell", "run", { cmd: "echo hello" });
} catch (error) {
  if (error instanceof FarameshAuthError) {
    console.error("Authentication error:", error.message);
  } else if (error instanceof FarameshPolicyError) {
    console.error("Action denied by policy:", error.message);
  } else if (error instanceof FarameshError) {
    console.error("Faramesh error:", error.message);
  } else {
    console.error("Unexpected error:", error);
  }
}
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

```typescript
import {
  configure,
  submitAction,
  getAction,
  approveAction,
  waitForCompletion,
} from "@faramesh/sdk";

configure({ baseUrl: "http://127.0.0.1:8000" });

// Submit action
const action = await submitAction(
  "my-agent",
  "shell",
  "run",
  { cmd: "echo hello" }
);

console.log(`Action ${action.id} status: ${action.status}`);

// If pending approval, approve it
if (action.status === "pending_approval") {
  const approved = await approveAction(
    action.id,
    action.approval_token!,
    "Looks safe"
  );
  console.log(`Approved: ${approved.status}`);
}

// Wait for completion
if (action.status === "allowed" || action.status === "approved") {
  const final = await waitForCompletion(action.id, { timeoutMs: 60000 });
  console.log(`Final status: ${final.status}`);
  if (final.status === "succeeded") {
    console.log("Action completed successfully!");
  } else if (final.status === "failed") {
    console.log(`Action failed: ${final.error}`);
  }
}
```

### Retry Logic

The SDK includes automatic retry logic:

```typescript
configure({
  baseUrl: "http://127.0.0.1:8000",
  maxRetries: 5,  // Retry up to 5 times
  retryBackoffFactor: 1.0,  // Exponential backoff
});
```

### Timeout Configuration

```typescript
configure({
  timeoutMs: 60000,  // 60 second timeout for all requests
});
```

### Custom Telemetry

```typescript
configure({
  baseUrl: "http://127.0.0.1:8000",
  onRequestStart: (method, url) => {
    console.log(`Starting ${method} ${url}`);
  },
  onRequestEnd: (method, url, statusCode, durationMs) => {
    console.log(`Completed ${method} ${url} in ${durationMs}ms (status: ${statusCode})`);
  },
  onError: (error) => {
    console.error("Error:", error);
  },
});
```

### Async/Await Pattern

```typescript
async function processAction() {
  try {
    const action = await submitAction("agent", "http", "get", { url: "https://example.com" });
    
    if (action.status === "pending_approval") {
      await approveAction(action.id, action.approval_token!);
    }
    
    const final = await waitForCompletion(action.id);
    return final;
  } catch (error) {
    if (error instanceof FarameshError) {
      console.error("Faramesh error:", error.message);
    }
    throw error;
  }
}
```

### Promise Chaining

```typescript
submitAction("agent", "http", "get", { url: "https://example.com" })
  .then((action) => {
    if (action.status === "pending_approval") {
      return approveAction(action.id, action.approval_token!);
    }
    return action;
  })
  .then((action) => waitForCompletion(action.id))
  .then((final) => {
    console.log("Final status:", final.status);
  })
  .catch((error) => {
    console.error("Error:", error);
  });
```

---

## Type Definitions

### Action Type

```typescript
interface Action {
  id: string;
  agent_id: string;
  tool: string;
  operation: string;
  params: Record<string, any>;
  context: Record<string, any>;
  status: "allowed" | "pending_approval" | "denied" | "executing" | "succeeded" | "failed";
  decision?: "allow" | "deny" | "require_approval";
  reason?: string;
  risk_level?: "low" | "medium" | "high";
  approval_token?: string;
  policy_version?: string;
  created_at: string;
  updated_at: string;
}
```

### Event Type

```typescript
interface FarameshEvent {
  id: string;
  action_id: string;
  event_type: "created" | "decision_made" | "approved" | "denied" | "started" | "succeeded" | "failed";
  meta: Record<string, any>;
  created_at: string;
}
```

---

## Examples

### Basic Submit

```typescript
// examples/submit.ts
import { configure, submitAction } from "@faramesh/sdk";

configure({ baseUrl: "http://127.0.0.1:8000" });

(async () => {
  const action = await submitAction(
    "test-agent",
    "http",
    "get",
    { url: "https://example.com" }
  );
  console.log("Action:", action);
})();
```

### Approval Flow

```typescript
// examples/approve.ts
import { configure, submitAction, approveAction, waitForCompletion } from "@faramesh/sdk";

configure({ baseUrl: "http://127.0.0.1:8000" });

(async () => {
  const action = await submitAction("agent", "shell", "run", { cmd: "echo hello" });
  
  if (action.status === "pending_approval") {
    console.log("Approving action...");
    const approved = await approveAction(action.id, action.approval_token!);
    console.log("Approved:", approved);
    
    const final = await waitForCompletion(action.id);
    console.log("Final:", final);
  }
})();
```

### List and Filter

```typescript
// examples/list.ts
import { configure, listActions } from "@faramesh/sdk";

configure({ baseUrl: "http://127.0.0.1:8000" });

(async () => {
  const actions = await listActions({
    status: "pending_approval",
    tool: "shell",
    limit: 10,
  });
  
  console.log(`Found ${actions.length} actions`);
  actions.forEach((action) => {
    console.log(`- ${action.id}: ${action.status}`);
  });
})();
```

---

## Running Examples

```bash
cd sdk/node
npm install
npm run build
node examples/submit.js
node examples/approve.js
node examples/list.js
```

---

## Best Practices

### 1. Always Handle Errors

```typescript
try {
  const action = await submitAction(...);
} catch (error) {
  if (error instanceof FarameshPolicyError) {
    // Handle policy denial
  } else if (error instanceof FarameshError) {
    // Handle other Faramesh errors
    console.error("Error:", error.message);
  }
}
```

### 2. Use TypeScript

The SDK is written in TypeScript and provides full type definitions:

```typescript
import { Action, ClientConfig } from "@faramesh/sdk";

const action: Action = await submitAction(...);
```

### 3. Check Status Before Operations

```typescript
const action = await getAction(actionId);

if (action.status === "pending_approval") {
  await approveAction(action.id, action.approval_token!);
} else if (action.status === "allowed") {
  await startAction(action.id);
}
```

### 4. Use Timeouts

```typescript
// Set reasonable timeouts
configure({ timeoutMs: 30000 });

// Or per-request
const final = await waitForCompletion(actionId, { timeoutMs: 60000 });
```

### 5. Monitor with Event Streaming

```typescript
import { streamEvents } from "@faramesh/sdk";

for await (const event of streamEvents()) {
  if (event.event_type === "approved") {
    // Handle approval
  }
}
```

---

## See Also

- [API Reference](API.md) - REST API endpoints
- [Error Handling](ERROR-HANDLING.md) - Error codes and handling
- [Integration Guide](INTEGRATIONS.md) - Framework integrations
- [Quick Start](../QUICKSTART.md) - Getting started guide
- [Python SDK](SDK-Python.md) - Python SDK reference
