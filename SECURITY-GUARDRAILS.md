# Security Guardrails

Faramesh implements multiple layers of security to ensure safe governance of AI agent actions. This document describes all security mechanisms and guardrails.

## Security Model

Faramesh follows a **deny-by-default** security model:

1. **No Side Effects Until Approval**: Policy evaluation has no side effects. Actions are only executed after explicit approval.
2. **Input Validation**: All inputs are validated and sanitized before processing.
3. **Defense in Depth**: Multiple security layers protect against various attack vectors.
4. **Secure-by-Default**: Actions are denied unless explicitly allowed by policy.

---

## Input Validation

### String Validation

All external string inputs are validated using `validate_external_string()`:

**Checks:**
- Not `None`
- Is a string type
- Not empty (after stripping)
- Maximum length: 10,000 characters (configurable)
- No null bytes (`\x00`)
- Stripped of leading/trailing whitespace

**Example:**
```python
from faramesh.server.security.guard import validate_external_string

# Valid
validated = validate_external_string("hello", "field_name")

# Invalid - raises SecurityError
validate_external_string(None, "field_name")  # Cannot be None
validate_external_string("", "field_name")    # Cannot be empty
validate_external_string("x" * 10001, "field_name")  # Too long
```

**Use Cases:**
- Validating tool names, operation names, agent IDs
- Validating string values in params and context
- Preventing buffer overflow attacks
- Preventing null byte injection

---

### Parameter Validation

Action parameters are validated using `validate_action_params()`:

**Checks:**
- Must be a dictionary
- Maximum size: 100,000 bytes when JSON serialized
- Recursive validation of nested dictionaries (max depth: 10)
- String values validated using `validate_external_string()`
- List items validated if strings
- Prevents circular references (depth limit)

**Allowed Parameter Keys (Whitelist):**
```python
ALLOWED_PARAM_KEYS = {
    "cmd", "url", "method", "headers", "data", "body", "path", "branch",
    "amount", "currency", "user_id", "email", "message", "subject",
    "file", "directory", "timeout", "env", "cwd", "stdin",
}
```

**Note:** Unknown keys are currently allowed but validated. This can be made strict in production.

**Example:**
```python
from faramesh.server.security.guard import validate_action_params

# Valid
params = {"cmd": "echo hello", "timeout": 30}
validated = validate_action_params(params, "shell")

# Invalid - raises SecurityError
validate_action_params(None, "shell")  # Must be dict
validate_action_params({"cmd": "x" * 10001}, "shell")  # String too long
```

**Protection Against:**
- Parameter injection attacks
- Oversized payloads (DoS)
- Deeply nested structures (stack overflow)
- Circular references (infinite loops)

---

### Context Validation

Action context is validated using `validate_context()`:

**Checks:**
- Must be a dictionary (or `None`, which becomes `{}`)
- Maximum size: 10,000 bytes when JSON serialized
- Recursive validation of nested dictionaries (max depth: 10)
- String values validated using `validate_external_string()`
- List items validated if strings

**Example:**
```python
from faramesh.server.security.guard import validate_context

# Valid
context = {"user": "alice", "environment": "production"}
validated = validate_context(context)

# Invalid - raises SecurityError
validate_context({"user": "x" * 10001})  # String too long
```

---

## Command Sanitization

### Shell Command Sanitization

Shell commands are sanitized using `sanitize_shell_command()`:

**Checks:**
- Must be a string
- Not empty (after stripping)
- Maximum length: 10,000 characters
- Dangerous pattern detection:
  - Command chaining with `;`, `&&`, `|`
  - Destructive commands: `rm`, `del`, `format`, `mkfs`, `shutdown`, `reboot`, `halt`
  - Command substitution: backticks `` `...` `` and `$(...)`

**Example:**
```python
from faramesh.server.security.guard import sanitize_shell_command

# Valid
sanitize_shell_command("echo hello")

# Invalid - raises SecurityError
sanitize_shell_command("rm -rf /; echo hello")  # Dangerous pattern
sanitize_shell_command("echo `rm -rf /`")       # Command substitution
```

**Important Notes:**
1. **Best-Effort Sanitization**: This is a safety layer, but the real security comes from requiring approval before execution.
2. **Not a Replacement for Approval**: Even sanitized commands require human approval if policy requires it.
3. **Policy-Based Control**: Use policies to deny dangerous commands entirely.

**Protection Against:**
- Command injection attacks
- Command chaining attacks
- Destructive command execution
- Command substitution attacks

---

## No Side Effects Enforcement

### `enforce_no_side_effects()`

Critical security check that prevents execution of actions in `pending_approval` status.

**Checks:**
- Actions in `pending_approval` status cannot be executed
- Actions with `require_approval` decision must be `approved` or `allowed` before execution

**Example:**
```python
from faramesh.server.security.guard import enforce_no_side_effects

# Valid
enforce_no_side_effects("allowed", "allow")  # OK
enforce_no_side_effects("approved", "require_approval")  # OK

# Invalid - raises SecurityError
enforce_no_side_effects("pending_approval", "require_approval")  # Cannot execute
```

**Protection Against:**
- Unauthorized action execution
- Bypassing approval workflows
- Race conditions in concurrent scenarios

**Implementation:**
This check is enforced at multiple points:
1. When starting action execution (`POST /v1/actions/{id}/start`)
2. When reporting results (`POST /v1/actions/{id}/result`)
3. In the executor before actual execution

---

## Policy Decision Validation

### `validate_policy_decision()`

Validates that policy decisions are valid enum values.

**Valid Decisions:**
- `allow`
- `deny`
- `require_approval`

**Example:**
```python
from faramesh.server.security.guard import validate_policy_decision

# Valid
validate_policy_decision("allow")
validate_policy_decision("deny")
validate_policy_decision("require_approval")

# Invalid - raises SecurityError
validate_policy_decision("invalid")  # Not a valid decision
validate_policy_decision(None)       # Cannot be None
```

**Protection Against:**
- Invalid policy decisions
- Type confusion attacks
- Enum manipulation

---

## Optimistic Locking

Faramesh uses optimistic locking to prevent race conditions in concurrent scenarios.

### How It Works

1. Each action has a `version` field that increments on updates
2. When updating an action, the current version is checked
3. If version doesn't match, update is rejected (409 Conflict)

**Protection Against:**
- Race conditions in concurrent approval/execution
- Lost updates
- Concurrent modification conflicts

**Example:**
```python
# Action has version=1
# Thread 1: Reads action (version=1)
# Thread 2: Reads action (version=1)
# Thread 1: Updates action (version=1 -> 2) ✓
# Thread 2: Updates action (version=1 -> 2) ✗ (409 Conflict - version mismatch)
```

---

## Authentication

### Bearer Token Authentication

If `FARAMESH_TOKEN` is set, all `/v1/*` endpoints require authentication:

```http
Authorization: Bearer <token>
```

**Protection Against:**
- Unauthorized API access
- Token theft (if token is compromised, rotate it)

**Best Practices:**
- Use strong, randomly generated tokens
- Rotate tokens regularly
- Store tokens securely (environment variables, secrets management)
- Never commit tokens to version control

---

## Deny-by-Default Policy

### Policy Evaluation

1. Policies are evaluated in order (first-match-wins)
2. If no rule matches, action is **denied by default**
3. This ensures unknown actions are blocked

**Example:**
```yaml
rules:
  - match:
      tool: "http"
      op: "get"
    allow: true

  # No rule matches "shell" tool
  # Result: DENIED (deny-by-default)
```

**Protection Against:**
- Unknown/untested tools
- Policy misconfiguration
- Accidental action execution

---

## Size Limits

### Maximum Lengths

| Field | Maximum Size |
|-------|--------------|
| String values | 10,000 characters |
| Params (JSON) | 100,000 bytes |
| Context (JSON) | 10,000 bytes |
| Recursion depth | 10 levels |

**Protection Against:**
- Buffer overflow attacks
- DoS via oversized payloads
- Stack overflow from deep recursion

---

## Error Handling

### Safe Failure Modes

Faramesh implements safe failure modes:

1. **Global Exception Handler**: Catches all unhandled exceptions and returns proper HTTP responses (prevents server crashes)
2. **Validation Errors**: Return 422 with clear error messages (no information leakage)
3. **Security Errors**: Return 400/403 with actionable messages (no sensitive data exposure)

**Protection Against:**
- Server crashes from unexpected errors
- Information leakage through error messages
- Denial of service from unhandled exceptions

---

## Best Practices

### 1. Use Policies for Security

Don't rely solely on input validation. Use policies to:
- Deny dangerous tools/operations
- Require approval for high-risk actions
- Block specific patterns (e.g., `rm -rf`)

### 2. Enable Authentication

Always set `FARAMESH_TOKEN` in production:
```bash
export FARAMESH_TOKEN=$(openssl rand -hex 32)
```

### 3. Monitor Security Events

- Monitor denial rates (high denial rate may indicate attacks)
- Monitor error rates (validation errors may indicate malicious input)
- Review approval decisions regularly

### 4. Regular Security Audits

- Review policy rules regularly
- Test policies against known attack patterns
- Update policies as new threats emerge

### 5. Keep Faramesh Updated

- Update to latest version for security patches
- Monitor security advisories
- Report vulnerabilities responsibly

---

## Security Limitations

### Known Limitations

1. **Shell Command Execution**: If executors use `shell=True`, command sanitization is best-effort. Real security comes from approval workflows.

2. **Parameter Whitelist**: Currently, unknown parameter keys are allowed (but validated). This can be made strict per tool in production.

3. **No Rate Limiting**: Faramesh doesn't implement rate limiting. Use a reverse proxy (nginx) or API gateway for rate limiting.

4. **No Input Encryption**: Inputs are not encrypted at rest. Use database encryption for sensitive data.

5. **Policy File Security**: Policy files are not encrypted. Protect policy files with file system permissions.

---

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT** create a public GitHub issue
2. **Do** report via:
   - GitHub Security Advisory: [Create a security advisory](https://github.com/faramesh/faramesh-core/security/advisories/new)
   - Email: security@faramesh.io (if available)

See [SECURITY.md](../SECURITY.md) for details.

---

## See Also

- [Error Handling](ERROR-HANDLING.md) - Error codes and handling
- [Policy Configuration](POLICIES.md) - Policy file format
- [API Reference](API.md) - API endpoints and authentication
- [Security Policy](../SECURITY.md) - Vulnerability reporting
