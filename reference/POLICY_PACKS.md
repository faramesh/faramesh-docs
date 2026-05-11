# Policy Packs

Policy packs are ready-to-use policy templates for common use cases. They provide a starting point for your own policies.

## Available Policy Packs

Policy packs are located in `policies/packs/`:

- **saas_refunds.yaml** - SaaS refund and payment operations
- **infra_shell_limits.yaml** - Infrastructure automation with shell commands
- **marketing_bot.yaml** - Marketing automation (social media, email)
- **restrict_http_external.yaml** - Restrict external HTTP requests

## Using Policy Packs

### Copy and Customize

1. Copy a policy pack to your policy file:
   ```bash
   cp policies/packs/saas_refunds.yaml policies/default.yaml
   ```

2. Customize for your needs:
   ```bash
   vim policies/default.yaml
   ```

3. Validate:
   ```bash
   faramesh policy-validate policies/default.yaml
   ```

### Merge with Existing Policy

You can merge policy packs with your existing policy:

```yaml
# policies/default.yaml
rules:
  # Your existing rules
  - match:
      tool: "custom"
      op: "*"
    allow: true

  # Include policy pack rules (copy from pack)
  - match:
      tool: "stripe"
      op: "refund"
      amount_gt: 100
    require_approval: true
    description: "Large refunds require approval"
    risk: "high"

  # Default deny (must be last)
  - match:
      tool: "*"
      op: "*"
    deny: true
```

---

## Policy Pack Details

### SaaS Refunds (`saas_refunds.yaml`)

**Use Case:** SaaS applications handling refunds, cancellations, or payment operations.

**Features:**
- Requires approval for refunds over $100
- Allows small refunds ($100 or less) automatically
- Allows other Stripe operations
- Default deny for unknown operations

**Policy:**
```yaml
rules:
  # Require approval for large refunds
  - match:
      tool: "stripe"
      op: "refund"
      amount_gt: 100
    require_approval: true
    description: "Large refunds require approval"
    risk: "high"

  # Allow small refunds automatically
  - match:
      tool: "stripe"
      op: "refund"
      amount_lte: 100
    allow: true
    description: "Small refunds are safe"
    risk: "low"

  # Allow other Stripe operations
  - match:
      tool: "stripe"
      op: "*"
    allow: true
    risk: "low"

  # Default deny
  - match:
      tool: "*"
      op: "*"
    deny: true
```

**Customization:**
- Adjust `amount_gt` threshold for your business needs
- Add rules for other payment tools (PayPal, Square, etc.)
- Add risk scoring rules for additional safety

---

### Infrastructure Shell Limits (`infra_shell_limits.yaml`)

**Use Case:** Infrastructure automation where you want to allow safe commands but block destructive operations.

**Features:**
- Blocks destructive commands completely (`rm -rf`, `shutdown`, `reboot`, etc.)
- Requires approval for system modifications (`apt install`, `systemctl`, etc.)
- Allows safe read-only commands (`ls`, `cat`, `grep`, etc.)
- Requires approval for unknown shell commands
- Default deny for non-shell tools

**Policy:**
```yaml
rules:
  # Block destructive commands completely
  - match:
      tool: "shell"
      op: "*"
      pattern: "rm -rf|shutdown|reboot|mkfs|dd if=|format"
    deny: true
    description: "Block destructive commands"
    risk: "high"

  # Require approval for commands that modify system state
  - match:
      tool: "shell"
      op: "*"
      pattern: "apt install|yum install|pip install|npm install|systemctl|service"
    require_approval: true
    description: "System modifications require approval"
    risk: "medium"

  # Allow safe read-only commands
  - match:
      tool: "shell"
      op: "*"
      pattern: "ls|cat|grep|find|ps|df|free|uptime|date|echo"
    allow: true
    description: "Safe read-only commands"
    risk: "low"

  # Require approval for other shell commands
  - match:
      tool: "shell"
      op: "*"
    require_approval: true
    description: "Unknown shell commands require approval"
    risk: "medium"

  # Default deny
  - match:
      tool: "*"
      op: "*"
    deny: true
```

**Customization:**
- Add more safe commands to the allow list
- Add more destructive patterns to the deny list
- Adjust approval requirements for your environment

---

### Marketing Bot (`marketing_bot.yaml`)

**Use Case:** Marketing automation agents that post content, send emails, or update social media.

**Features:**
- Allows HTTP GET requests (read-only)
- Requires approval for POST/PUT/PATCH (content posting/updates)
- Blocks HTTP DELETE (content deletion)
- Requires approval for email sending
- Default deny for unknown operations

**Policy:**
```yaml
rules:
  # Allow read-only operations
  - match:
      tool: "http"
      op: "get"
    allow: true
    description: "HTTP GET requests are safe"
    risk: "low"

  # Require approval for posting/updating content
  - match:
      tool: "http"
      op: "post"
    require_approval: true
    description: "Content posting requires approval"
    risk: "medium"

  - match:
      tool: "http"
      op: "put"
    require_approval: true
    description: "Content updates require approval"
    risk: "medium"

  - match:
      tool: "http"
      op: "patch"
    require_approval: true
    description: "Content modifications require approval"
    risk: "medium"

  # Block deletions
  - match:
      tool: "http"
      op: "delete"
    deny: true
    description: "Content deletion is blocked"
    risk: "high"

  # Allow email sending with approval
  - match:
      tool: "email"
      op: "*"
    require_approval: true
    description: "Email sending requires approval"
    risk: "medium"

  # Default deny
  - match:
      tool: "*"
      op: "*"
    deny: true
```

**Customization:**
- Add rules for specific social media APIs
- Adjust approval requirements per platform
- Add rules for scheduling tools

---

### Restrict HTTP External (`restrict_http_external.yaml`)

**Use Case:** Restrict external HTTP requests while allowing internal API calls.

**Features:**
- Allows HTTP requests to internal domains
- Requires approval for external HTTP requests
- Blocks specific dangerous domains
- Default deny for unknown operations

**Example Policy:**
```yaml
rules:
  # Allow internal API calls
  - match:
      tool: "http"
      op: "*"
      path_contains: "api.internal.com"
    allow: true
    description: "Internal API calls are safe"
    risk: "low"

  # Require approval for external requests
  - match:
      tool: "http"
      op: "*"
    require_approval: true
    description: "External HTTP requests require approval"
    risk: "medium"

  # Block specific dangerous domains
  - match:
      tool: "http"
      op: "*"
      contains: "malicious-site.com"
    deny: true
    description: "Blocked domain"
    risk: "high"

  # Default deny
  - match:
      tool: "*"
      op: "*"
    deny: true
```

---

## Example Policies

Additional example policies are in `policies/examples/`:

- **allow_http.yaml** - Allow all HTTP operations
- **deny_destructive_shell.yaml** - Block destructive shell commands
- **deny_unknown.yaml** - Deny all unknown tools (strict)
- **require_approval_shell.yaml** - Require approval for all shell commands
- **require_approval_stripe.yaml** - Require approval for Stripe operations

---

## Creating Your Own Policy Pack

### Structure

A policy pack should:

1. **Have a clear purpose** - Document what use case it's for
2. **Be complete** - Include default deny rule
3. **Be well-documented** - Include descriptions for each rule
4. **Be customizable** - Use clear thresholds and patterns

### Template

```yaml
# Policy Pack Name
# Use case description
# When to use this policy

rules:
  # Most specific rules first
  - match:
      tool: "specific_tool"
      op: "specific_operation"
      # Additional conditions
    allow: true  # or deny: true, require_approval: true
    description: "Clear description"
    risk: "low"  # or "medium", "high"

  # Less specific rules
  - match:
      tool: "tool"
      op: "*"
    require_approval: true
    description: "Description"
    risk: "medium"

  # Default deny (must be last)
  - match:
      tool: "*"
      op: "*"
    deny: true
    description: "Default deny - unknown operations"
    risk: "high"

# Optional: Risk scoring rules
risk:
  rules:
    - name: high_risk_pattern
      when:
        tool: tool
        operation: operation
        pattern: "dangerous|pattern"
      risk_level: high
```

### Best Practices

1. **Order matters** - Most specific rules first, default deny last
2. **Clear descriptions** - Help users understand each rule
3. **Risk levels** - Set appropriate risk levels
4. **Test thoroughly** - Test with sample actions before sharing
5. **Document use cases** - Explain when to use the pack

---

## Sharing Policy Packs

### Contributing

If you create a useful policy pack:

1. Create a new file in `policies/packs/`
2. Follow the naming convention: `use_case_description.yaml`
3. Add clear documentation at the top
4. Test with sample actions
5. Submit a pull request

### Naming Convention

Use descriptive names:
- `saas_refunds.yaml` ✓
- `infra_shell_limits.yaml` ✓
- `marketing_bot.yaml` ✓
- `policy.yaml` ✗ (too generic)

---

## See Also

- [Policy Configuration](POLICIES.md) - Policy file format and rules
- [Policy Examples](../policies/examples/) - Additional example policies
- [CLI Reference](CLI.md) - Policy management commands
- [Hot Reload](HOT_RELOAD.md) - Policy hot reload mechanism
