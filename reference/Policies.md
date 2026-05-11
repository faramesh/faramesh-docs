# Policy Configuration

Faramesh uses YAML-based policies to govern AI agent actions. Policies define rules that determine whether actions are allowed, denied, or require human approval.

## Policy File Location

By default, Faramesh loads policies from:

```
policies/default.yaml
```

**Custom Policy File:**
Set `FARA_POLICY_FILE` environment variable:
```bash
export FARA_POLICY_FILE=policies/custom.yaml
faramesh serve
```

---

## Policy Structure

### Basic Structure

```yaml
rules:
  # Policy rules (evaluated in order)
  - match:
      tool: "http"
      op: "get"
    allow: true
    description: "Allow HTTP GET requests"
    risk: "low"

# Optional: Risk scoring rules
risk:
  rules:
    - name: dangerous_shell
      when:
        tool: shell
        operation: run
        pattern: "rm -rf"
      risk_level: high
```

---

## Policy Rules

### Rule Evaluation

Rules are evaluated in order, and the **first matching rule wins**. If no rule matches, the action is **denied by default** (deny-by-default security model).

**Evaluation Order:**
1. Rules are checked from top to bottom
2. First rule that matches the action determines the decision
3. Remaining rules are not evaluated
4. If no rules match, action is denied

### Rule Structure

Each rule has:

1. **Match Conditions** (`match`): Conditions that must be met
2. **Effect** (`allow`, `deny`, or `require_approval`): What happens if rule matches
3. **Description** (optional): Human-readable description
4. **Risk** (optional): Risk level for this rule (`low`, `medium`, `high`)

**Example:**
```yaml
rules:
  - match:
      tool: "shell"
      op: "*"
    require_approval: true
    description: "Shell commands require approval"
    risk: "medium"
```

---

## Match Conditions

### Basic Matching

**Tool Matching:**
```yaml
match:
  tool: "shell"        # Exact match
  tool: "*"            # Wildcard (matches any tool)
```

**Operation Matching:**
```yaml
match:
  op: "run"            # Exact match
  operation: "run"     # Alias for 'op'
  op: "*"              # Wildcard (matches any operation)
```

**Combined:**
```yaml
match:
  tool: "http"
  op: "get"
```

### String Matching

**Contains:**
```yaml
match:
  tool: "shell"
  op: "run"
  contains: "rm -rf"   # Substring match in params JSON
```

**Pattern (Regex):**
```yaml
match:
  tool: "shell"
  op: "run"
  pattern: "rm -rf|shutdown|reboot"  # Regex pattern
```

**Note:** Pattern matching is case-insensitive by default.

### Numeric Comparisons

For monetary amounts or numeric values:

```yaml
match:
  tool: "stripe"
  op: "refund"
  amount_gt: 1000      # Greater than
  amount_lt: 5000      # Less than
  amount_gte: 100      # Greater than or equal
  amount_lte: 10000    # Less than or equal
```

**Example:**
```yaml
rules:
  - match:
      tool: "stripe"
      op: "refund"
      amount_gt: 1000
    require_approval: true
    description: "Large refunds require approval"
```

### Path Matching

For file operations:

```yaml
match:
  tool: "file"
  op: "write"
  path_contains: "/tmp"        # Path contains substring
  path_starts_with: "/home"    # Path starts with
  path_ends_with: ".log"       # Path ends with
```

### HTTP Method Matching

For HTTP tools:

```yaml
match:
  tool: "http"
  method: "POST"       # HTTP method
```

### Agent ID Matching

```yaml
match:
  agent_id: "production-agent"  # Specific agent
```

### Field Matching

Custom field matching:

```yaml
match:
  field: "environment"
  value: "production"
```

### Combining Conditions

All conditions in a `match` block must be satisfied (AND logic):

```yaml
match:
  tool: "shell"
  op: "run"
  pattern: "rm -rf"
  agent_id: "deployment-bot"
```

This matches shell commands with "rm -rf" from the "deployment-bot" agent.

---

## Rule Effects

Each rule must have exactly one effect:

### `allow: true`

Immediately allow the action. Action can be executed without approval.

```yaml
rules:
  - match:
      tool: "http"
      op: "get"
    allow: true
    description: "Allow HTTP GET requests"
```

### `deny: true`

Immediately deny the action. Action cannot be executed.

```yaml
rules:
  - match:
      tool: "unknown"
      op: "*"
    deny: true
    description: "Deny unknown tools"
```

### `require_approval: true`

Require human approval before execution. Action enters `pending_approval` status.

```yaml
rules:
  - match:
      tool: "shell"
      op: "*"
    require_approval: true
    description: "Shell commands require approval"
```

---

## Risk Scoring

Risk scoring provides an independent assessment of action risk. Risk rules are evaluated separately from policy rules.

### Risk Rules

```yaml
risk:
  rules:
    - name: dangerous_shell
      when:
        tool: shell
        operation: run
        pattern: "rm -rf|shutdown|reboot"
      risk_level: high
    
    - name: large_payments
      when:
        tool: stripe
        operation: refund
        amount_gt: 1000
      risk_level: medium
```

### Risk Levels

- **`low`**: Safe operations (default)
- **`medium`**: Moderate risk
- **`high`**: High risk

### Risk Rule Matching

Risk rules use the same match conditions as policy rules. The first matching risk rule determines the risk level.

### High-Risk Auto-Approval Override

If an action has `risk_level: high` and a policy rule would `allow` it, Faramesh automatically changes the decision to `require_approval` for safety.

**Example:**
```yaml
rules:
  - match:
      tool: "shell"
      op: "*"
    allow: true  # Policy would allow

risk:
  rules:
    - name: dangerous_shell
      when:
        tool: shell
        operation: run
        pattern: "rm -rf"
      risk_level: high  # Risk rule marks as high

# Result: Decision is upgraded to require_approval
```

---

## Policy Examples

### Example 1: Deny Destructive Commands

```yaml
rules:
  - match:
      tool: "shell"
      op: "*"
      pattern: "rm -rf|shutdown|reboot|mkfs|format"
    deny: true
    description: "Block destructive commands"
    risk: "high"

  - match:
      tool: "shell"
      op: "*"
    require_approval: true
    description: "Other shell commands require approval"
    risk: "medium"

  - match:
      tool: "*"
      op: "*"
    deny: true
    description: "Default deny"
```

### Example 2: Require Approval for Large Payments

```yaml
rules:
  - match:
      tool: "stripe"
      op: "refund"
      amount_gt: 1000
    require_approval: true
    description: "Large refunds require approval"
    risk: "medium"

  - match:
      tool: "stripe"
      op: "*"
    allow: true
    description: "Allow other Stripe operations"
    risk: "low"

  - match:
      tool: "*"
      op: "*"
    deny: true
```

### Example 3: Allow Read Operations, Require Approval for Writes

```yaml
rules:
  # Allow safe read operations
  - match:
      tool: "http"
      op: "get"
    allow: true
    description: "Allow HTTP GET"
    risk: "low"

  - match:
      tool: "file"
      op: "read"
    allow: true
    description: "Allow file reads"
    risk: "low"

  # Require approval for writes
  - match:
      tool: "http"
      method: "POST"
    require_approval: true
    description: "HTTP POST requires approval"
    risk: "medium"

  - match:
      tool: "file"
      op: "write"
    require_approval: true
    description: "File writes require approval"
    risk: "medium"

  # Default deny
  - match:
      tool: "*"
      op: "*"
    deny: true
```

### Example 4: Agent-Specific Rules

```yaml
rules:
  # Production agent has stricter rules
  - match:
      agent_id: "production-agent"
      tool: "shell"
      op: "*"
    require_approval: true
    description: "Production agent shell commands require approval"
    risk: "high"

  # Development agent has relaxed rules
  - match:
      agent_id: "dev-agent"
      tool: "shell"
      op: "*"
    allow: true
    description: "Dev agent can run shell commands"
    risk: "low"

  # Default deny
  - match:
      tool: "*"
      op: "*"
    deny: true
```

---

## Policy Validation

### Validate Policy File

```bash
faramesh policy-validate policies/default.yaml
```

**Checks:**
- YAML syntax
- Required fields (`rules`)
- Valid match conditions
- Exactly one effect per rule
- Valid risk rules (if present)

### Test Policy Against Action

```bash
# Create test action JSON file
cat > test_action.json <<EOF
{
  "tool": "shell",
  "operation": "run",
  "params": {"cmd": "echo hello"},
  "context": {"agent_id": "test-agent"}
}
EOF

# Test against policy
faramesh policy-test test_action.json
```

**Output:**
- Decision: `allow`, `deny`, or `require_approval`
- Reason: Policy rule description
- Risk level: `low`, `medium`, or `high`

### Compare Policies

```bash
faramesh policy-diff policies/old.yaml policies/new.yaml
```

**Output:**
- Summary of differences
- Added/removed/modified rules

---

## Policy Hot Reload

Hot reload allows updating policies without restarting the server:

```bash
faramesh serve --hot-reload
```

**How It Works:**
1. Server monitors policy file for changes
2. On change, policy is reloaded and validated
3. If valid, new policy replaces current one
4. If invalid, previous valid policy stays active

**Safety:**
- Invalid policies don't crash the server
- Previous valid policy remains active
- Clear error messages in logs

See [Hot Reload](HOT_RELOAD.md) for detailed documentation.

---

## Best Practices

### 1. Order Rules from Specific to General

```yaml
rules:
  # Most specific first
  - match:
      tool: "shell"
      op: "run"
      pattern: "rm -rf"
    deny: true

  # Less specific
  - match:
      tool: "shell"
      op: "*"
    require_approval: true

  # Most general last (default deny)
  - match:
      tool: "*"
      op: "*"
    deny: true
```

### 2. Always Include Default Deny Rule

```yaml
rules:
  # ... your specific rules ...

  # Default deny (must be last)
  - match:
      tool: "*"
      op: "*"
    deny: true
    description: "Default deny - deny unknown actions"
```

### 3. Use Descriptive Rule Descriptions

```yaml
rules:
  - match:
      tool: "shell"
      op: "*"
    require_approval: true
    description: "Shell commands require approval for security"
```

### 4. Test Policies Before Deploying

```bash
# Validate syntax
faramesh policy-validate policies/default.yaml

# Test with sample actions
faramesh policy-test examples/http_action.json

# Compare changes
faramesh policy-diff policies/old.yaml policies/new.yaml
```

### 5. Use Risk Scoring for Additional Safety

```yaml
risk:
  rules:
    - name: dangerous_patterns
      when:
        tool: shell
        operation: run
        pattern: "rm -rf|shutdown|reboot"
      risk_level: high
```

### 6. Version Control Policies

- Keep policies in version control
- Use meaningful commit messages
- Review policy changes before deploying
- Test policies in staging before production

---

## Policy File Format

### Complete Example

```yaml
# Faramesh Policy File
# Rules are evaluated in order - first match wins

rules:
  # Allow safe read operations
  - match:
      tool: "http"
      op: "get"
    allow: true
    description: "Allow HTTP GET requests"
    risk: "low"

  # Require approval for shell commands
  - match:
      tool: "shell"
      op: "*"
    require_approval: true
    description: "Shell commands require approval"
    risk: "medium"

  # Deny destructive commands
  - match:
      tool: "shell"
      op: "*"
      pattern: "rm -rf|shutdown|reboot|mkfs"
    deny: true
    description: "Block destructive commands"
    risk: "high"

  # Default deny (must be last)
  - match:
      tool: "*"
      op: "*"
    deny: true
    description: "Default deny - deny unknown actions"
    risk: "high"

# Optional: Risk scoring rules
risk:
  rules:
    - name: dangerous_shell
      when:
        tool: shell
        operation: run
        pattern: "rm -rf|shutdown|reboot"
      risk_level: high
    
    - name: large_payments
      when:
        tool: stripe
        operation: refund
        amount_gt: 1000
      risk_level: medium
```

---

## Troubleshooting

### Policy Not Loading

**Check:**
1. Policy file exists: `ls policies/default.yaml`
2. File is readable: `cat policies/default.yaml`
3. YAML syntax is valid: `faramesh policy-validate policies/default.yaml`
4. Server logs for errors

### Policy Not Working

**Check:**
1. Policy file is loaded: `GET /v1/policy/info`
2. Rules are in correct order (most specific first)
3. Default deny rule is last
4. Test with `faramesh policy-test`

### Actions Always Denied

**Check:**
1. Default deny rule is too broad
2. Rules are ordered incorrectly
3. Match conditions are too strict
4. Use `faramesh explain <action-id>` to see which rule matched

---

## See Also

- [Hot Reload](HOT_RELOAD.md) - Policy hot reload mechanism
- [CLI Reference](CLI.md) - Policy management commands
- [Security Guardrails](SECURITY-GUARDRAILS.md) - Security mechanisms
- [Policy Packs](POLICY_PACKS.md) - Ready-to-use policy templates
- [Quick Start](../QUICKSTART.md) - Getting started guide
