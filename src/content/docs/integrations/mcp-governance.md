---
title: MCP Governance
description: Control Model Context Protocol (MCP) client connections and tool calls through governance policies, edge authentication, and session management.
---

Model Context Protocol (MCP) governance enables Faramesh to intercept and control tool access from external MCP clients, preventing unauthorized tool calls and enforcing policy across MCP HTTP gateways and stdio wrappers.

## Why MCP Governance

MCP servers expose tool interfaces over HTTP or stdio. Without governance:

```bash
# Uncontrolled MCP client could call any tool
curl -X POST http://mcp-server:8080/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "shell/rm", "arguments": {"path": "/data/*"}}' # ← No policy check
# Result: arbitrary command execution
```

With Faramesh MCP governance:

```bash
# Policy evaluates all MCP tools/calls before forwarding
curl -X POST http://faramesh-gateway:19092/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "shell/rm", "arguments": {"path": "/data/*"}}'
# Faramesh evaluates: deny shell/*
# Response: JSON-RPC error -32003 (permission denied)
```

## 1. Architecture

### Deployment Modes

Faramesh intercepts MCP through two modes:

**HTTP Gateway**:
```
MCP Client
  ↓ HTTPS/HTTP
Faramesh Gateway (port 19092)
  ├─ Validates JSON-RPC format
  ├─ Enforces policy on tools/call
  ├─ Manages sessions and auth
  ↓ HTTP
Upstream MCP Server (port 8080)
```

**Stdio Wrapper**:
```
MCP Client
  ↓ stdin/stdout (JSON-RPC)
faramesh mcp wrap -- mcp-server-cmd
  ├─ Intercepts tools/call in JSON-RPC stream
  ├─ Evaluates policy
  ├─ Enforces decision
  ↓ stdin/stdout
Wrapped MCP Server Process
```

### Message Flow

For a `tools/call` request:

```
1. Client sends:
   {"jsonrpc": "2.0", "method": "tools/call",
    "params": {"name": "stripe/refund", "arguments": {...}}}

2. Gateway validates:
   ✓ Valid JSON-RPC 2.0 format
   ✓ Required fields present
   ✓ No required fields missing

3. Policy evaluation:
   ✓ Agent has permission for stripe/refund
   ✓ Arguments match policy expressions
   ✓ Decision: PERMIT

4. Forward to upstream:
   POST /tools/call {"name": "stripe/refund", ...}

5. Post-scan tool output:
   Response from upstream → Scan for secrets
   → Return to client
```

## 2. Setting Up MCP Gateway

### Basic Configuration

```bash
faramesh serve \
  --policy policy.fpl \
  --mcp-proxy-port 19092 \
  --mcp-target http://127.0.0.1:8080
```

**Parameters**:
- `--mcp-proxy-port` — Gateway listens on this port (default: 19092)
- `--mcp-target` — Upstream MCP server address

### With Origin Controls

Restrict which clients can connect:

```bash
faramesh serve \
  --policy policy.fpl \
  --mcp-proxy-port 19092 \
  --mcp-target http://127.0.0.1:8080 \
  --mcp-allowed-origins https://app.example.com,https://admin.example.com
```

**Behavior**:
- `Origin` header from requests must match allowlist
- If no `Origin` header → allowed
- Loopback origins (`localhost`, `127.0.0.1`) → always allowed

## 3. Edge Authentication

Gate MCP client access with cryptographic credentials:

### Bearer Token

Require `Authorization: Bearer <token>` header:

```bash
faramesh serve \
  --policy policy.fpl \
  --mcp-proxy-port 19092 \
  --mcp-target http://127.0.0.1:8080 \
  --mcp-edge-auth-mode bearer \
  --mcp-edge-auth-bearer-token "sk_test_abc123xyz"
```

**Client request**:
```bash
curl -X POST http://localhost:19092/tools/call \
  -H "Authorization: Bearer sk_test_abc123xyz" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {...}}'
```

**From environment**:
```bash
export FARAMESH_MCP_EDGE_AUTH_BEARER_TOKEN="sk_test_abc123xyz"
faramesh serve \
  --policy policy.fpl \
  --mcp-proxy-port 19092 \
  --mcp-target http://127.0.0.1:8080 \
  --mcp-edge-auth-mode bearer
```

### Mutual TLS (mTLS)

Require client certificate:

```bash
faramesh serve \
  --policy policy.fpl \
  --mcp-proxy-port 19092 \
  --mcp-target http://127.0.0.1:8080 \
  --mcp-edge-auth-mode mtls \
  --tls-cert /etc/faramesh/tls.crt \
  --tls-key /etc/faramesh/tls.key \
  --tls-client-ca /etc/faramesh/client-ca.crt
```

**Client request** (with certificate):
```bash
curl -X POST https://localhost:19092/tools/call \
  --cert /path/to/client.crt \
  --key /path/to/client.key \
  --cacert /path/to/ca.crt \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {...}}'
```

### Combined Bearer or mTLS

Allow either authentication method:

```bash
faramesh serve \
  --policy policy.fpl \
  --mcp-proxy-port 19092 \
  --mcp-target http://127.0.0.1:8080 \
  --mcp-edge-auth-mode bearer_or_mtls \
  --mcp-edge-auth-bearer-token "sk_test_abc123xyz"
```

## 4. Policy Governance

### Controlling Tool Access

Write FPL policies that evaluate `tools/call`:

```fpl
agent llm-client {
  default deny

  rules {
    # Allow read operations
    permit tools/call when \
      tool matches "read_*" && \
      args.permission == "read-only"

    # Allow stripe operations (verified principal only)
    permit tools/call when \
      tool matches "stripe/*" && \
      principal.verified == true && \
      args.amount <= 1000

    # Deny admin operations
    deny tools/call when tool matches "admin_*"

    # Defer high-value operations
    defer tools/call when tool matches "stripe/*" && args.amount > 1000 \
      notify: "finance"
  }
}
```

### Expression Context

In policy expressions, access MCP request details:

```fpl
# tool name
tool matches "stripe/*"

# arguments (tool-specific)
args.amount <= 1000
args.recipient matches "*.com"

# JSON-RPC metadata
method == "tools/call"

# Standard context (principal, delegation, etc.)
principal.verified == true
```

## 5. Session Management

### Session Tracking

Track individual client sessions:

```bash
faramesh serve \
  --policy policy.fpl \
  --mcp-proxy-port 19092 \
  --mcp-target http://127.0.0.1:8080 \
  --mcp-session-ttl 30m \
  --mcp-session-idle-timeout 10m
```

**Parameters**:
- `--mcp-session-ttl` — Max session lifetime (e.g., 30m, 1h)
- `--mcp-session-idle-timeout` — Inactivity timeout (e.g., 10m)

### Session Headers

Client provides session ID in requests:

```bash
curl -X POST http://localhost:19092/tools/call \
  -H "Mcp-Session-Id: session_abc123" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {...}}'
```

**Behavior**:
- Session TTL starts from first request
- Idle timeout resets on each new request
- When TTL or idle timeout exceeded → request denied
- `DELETE` request terminates session

## 6. Protocol Version Enforcement

Enforce strict protocol version compatibility:

### Strict Mode

```bash
faramesh serve \
  --policy policy.fpl \
  --mcp-proxy-port 19092 \
  --mcp-target http://127.0.0.1:8080 \
  --mcp-protocol-version-mode strict \
  --mcp-protocol-version 2025-06-18
```

**Validation**:
1. Client must send `MCP-Protocol-Version: 2025-06-18` header
2. Upstream must respond with matching header
3. Mismatch → `400` (bad request) or `502` (bad gateway)

### Client Request

```bash
curl -X POST http://localhost:19092/tools/call \
  -H "MCP-Protocol-Version: 2025-06-18" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {...}}'
```

## 7. Stdio Wrapper

### Wrapping MCP Servers

Wrap existing MCP server commands:

```bash
# Without Faramesh
mcp-server-binary --port 8080

# With Faramesh governance
faramesh mcp wrap -- mcp-server-binary --port 8080
```

**How it works**:
- Faramesh intercepts stdin/stdout JSON-RPC stream
- Evaluates `tools/call` against policy
- Forwards allowed calls to actual server
- Returns policy decisions for denied calls

### CLI Configuration

```bash
faramesh mcp wrap \
  --policy /etc/faramesh/policy.fpl \
  --data-dir /var/lib/faramesh \
  -- /usr/bin/mcp-server --port 8080
```

**Parameters**:
- `--policy` — Policy file path
- `--data-dir` — Faramesh data directory
- `--` — Separator before wrapped command

## 8. Event Notifications and Responses

### One-Way Forwarding

MCP allows notifications and responses (one-way messages):

```json
{"jsonrpc": "2.0", "method": "notifications/progress", "params": {...}}
```

**Behavior**:
- One-way messages are forwarded upstream
- Gateway returns `202 Accepted` (HTTP)
- No response correlation required

### Batch Operations

Process multiple requests/responses:

```json
[
  {"jsonrpc": "2.0", "method": "tools/call", "params": {...}, "id": 1},
  {"jsonrpc": "2.0", "method": "notifications/progress", "params": {...}},
  {"jsonrpc": "2.0", "result": "ok", "id": 2}
]
```

**Processing**:
- Each request is evaluated and forwarded
- Notifications/responses are one-way forwarded
- Output array includes only responses (notifications omitted)

## 9. Production Configuration

Comprehensive production setup:

```bash
faramesh serve \
  --policy /etc/faramesh/policy.fpl \
  --data-dir /var/lib/faramesh \
  --mcp-proxy-port 19092 \
  --mcp-target http://mcp-server.internal:8080 \
  --mcp-allowed-origins https://app.example.com,https://admin.example.com \
  --mcp-edge-auth-mode bearer \
  --mcp-edge-auth-bearer-token "$FARAMESH_MCP_AUTH_TOKEN" \
  --mcp-protocol-version-mode strict \
  --mcp-protocol-version 2025-06-18 \
  --mcp-session-ttl 30m \
  --mcp-session-idle-timeout 10m \
  --mcp-sse-replay-enabled \
  --mcp-sse-replay-max-events 256 \
  --mcp-sse-replay-max-age 10m \
  --tls-cert /etc/faramesh/tls.crt \
  --tls-key /etc/faramesh/tls.key
```

## 10. Troubleshooting

### Client Gets "Unauthorized" on Bearer Token

**Check**:
```bash
# Verify token matches
echo $FARAMESH_MCP_EDGE_AUTH_BEARER_TOKEN

# Check header in request
curl -v -X POST ... \
  -H "Authorization: Bearer $FARAMESH_MCP_EDGE_AUTH_TOKEN"
```

**Fix**: Ensure exact token match

### mTLS Connection Fails

**Check**:
```bash
# Verify certificates
openssl x509 -in /etc/faramesh/tls.crt -text -noout
openssl x509 -in /etc/faramesh/client-ca.crt -text -noout

# Test connection
curl --cert client.crt --key client.key --cacert ca.crt \
  https://localhost:19092/tools/call
```

### Policy Denies Valid Calls

**Check**:
```bash
# Review policy evaluation
faramesh policy validate policy.fpl

# Test specific tool in audit mode
faramesh policy eval --tool "stripe/charge" \
  --args '{"amount": 500}'
```

**Fix**: Adjust policy rules or arguments

## 11. Production Checklist

- [ ] Bearer token or mTLS is configured
- [ ] Policy file validates without errors
- [ ] Tool governance rules are tested
- [ ] Origin allowlist is configured
- [ ] Session TTL and timeouts are set appropriately
- [ ] Protocol version mode is strict
- [ ] SSE replay is configured (if using SSE)
- [ ] Upstream MCP server is healthy
- [ ] TLS certificates are valid and not expiring
- [ ] Audit logging is enabled for MCP calls

## See Also

- [FPL Language](/policies/fpl-language/)
- [Network Hardening](/advanced/network-hardening/)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Faramesh Core MCP Spec](https://github.com/faramesh/faramesh-core/blob/main/docs/power-users/mcp/MCP_INTERCEPTION_GOVERNANCE_SPEC.md)
