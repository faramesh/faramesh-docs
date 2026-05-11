---
title: Policy Packs
description: Bundled, tested policy templates for common governance patterns (payments, healthcare, devops, AI safety).
---

Policy packs are production-tested FPL policy templates bundled with Faramesh. They serve as starting points for common governance scenarios: payments, healthcare, devops operations, AI safety, etc. Packs support an observe-first rollout pattern: discover usage, attach policies in shadow mode, analyze decisions, then enforce.

## Available Packs

| Pack | Purpose | Use When |
|------|---------|----------|
| `faramesh/startup-default` | Deny-by-default with narrow permits | Starting from scratch |
| `faramesh/financial-saas` | Payment & refund governance | Building payment agents |
| `faramesh/healthcare` | PHI protection, verified principal gates | Healthcare compliance required |
| `faramesh/devops-safe` | Production mutation denial, deployment controls | Infrastructure automation |
| `faramesh/ai-safety` | HTTP posture, webhook safety, output limits | LLM agent safety |

Each pack includes:
- **policy.yaml** — YAML-format policy (auto-generated for all packs)
- **policy.fpl** — FPL-format policy (for bundled packs)
- **README.md** — Governance intent and rule explanation
- **fixtures/** — Test cases and validation data

## 1. Discovering Usage

Before applying any policy, understand what your agent actually does:

```bash
faramesh discover --source ./

# Output:
# Discovered tools:
# - stripe/refund (8 calls)
# - stripe/charge (42 calls)
# - read_customer (15 calls)
# - shell/run (2 calls) ← RISKY
# - send_email (3 calls)
# - http/get (28 calls)
```

**How it works**:
- Runs agent under instrumentation without policy
- Records all tool calls without blocking
- Categorizes by frequency and risk
- Outputs coverage map

## 2. Pack Attachment (Shadow Mode)

Attach a policy pack without enforcing (audit mode):

```bash
faramesh pack shadow faramesh/financial-saas

# Output:
# Policy: faramesh/financial-saas
# Mode: SHADOW (audit only, no blocking)
# Starting audit...
```

**Shadow mode properties**:
- All tool calls are allowed
- Policy decisions are logged and recorded
- Audit trail shows what would have been denied
- No impact on agent functionality
- Safe for testing in production

### Analyzing Shadow Results

After 1-2 hours of shadow mode:

```bash
faramesh pack status faramesh/financial-saas --shadow-analysis

# Output:
# Decision breakdown:
# PERMIT: 847 (95%)
# DEFER: 12 (1%)    ← require review
# DENY:  31 (3%)    ← would block
#
# Top denials:
# 1. shell/run (24 calls) - policy denies shell access
# 2. send_email to non-verified domains (7 calls)
#
# Recommendation: Review those 31 denial cases, then ENFORCE
```

### Adjusting Policies

If the policy is too strict:

```bash
faramesh pack customize faramesh/financial-saas \
  --allow-tool "shell/run" \
  --reason "our ops scripts need shell access" \
  --output my-policy.fpl
```

Creates customized policy with additions:

```fpl
# Generated customization for faramesh/financial-saas
permit shell/run when principal.role == "devops"  # added by customize
```

## 3. Enforcement

When shadow analysis looks good, enable enforcement:

```bash
faramesh pack enforce faramesh/financial-saas

# Output:
# Policy: faramesh/financial-saas
# Mode: ENFORCE (will block)
# Policy loaded and active
```

**Enforcement properties**:
- Policy rules are now active
- Denies are actually denied
- Defer actions route to approvers
- Full audit trail active

### Progressive Enforcement

For high-risk deployments, use canary rollout:

```bash
# Stage 1: 10% of traffic
faramesh pack enforce faramesh/financial-saas \
  --canary 10 \
  --duration 1h

# Monitor for 1 hour...

# Stage 2: 50% of traffic
faramesh pack enforce faramesh/financial-saas \
  --canary 50 \
  --duration 2h

# Stage 3: 100%
faramesh pack enforce faramesh/financial-saas
```

## 4. Pack Contents

Each pack contains:

### policy.fpl (FPL Source)

```fpl
agent financial-saas {
  default deny

  budget session {
    max $10000
    daily $100000
    max_calls 500
    on_exceed deny
  }

  rules {
    # Deny shell access
    deny! shell/* reason: "no shell for financial agents"

    # Payments require verified principal
    deny stripe/* when principal.verified != true

    # Large refunds require approval
    defer stripe/refund when args.amount > 5000 notify: "finance"

    # Standard payments allowed
    permit stripe/charge when args.amount <= 5000
    permit stripe/refund when args.amount <= 5000

    # Customer read access
    permit read_customer when principal.verified == true
  }
}
```

### policy.yaml (Generated)

Auto-generated YAML version with same rules:

```yaml
faramesh-version: "1.0"
agent-id: "financial-saas"
default_effect: deny

budget:
  max: 10000
  daily: 100000
  max_calls: 500
  on_exceed: deny

rules:
  - id: deny-shell
    match:
      tool: "shell/*"
    effect: deny
    reason: "no shell for financial agents"

  # ... remaining rules ...
```

### README.md (Governance Intent)

```markdown
# Financial SaaS Policy Pack

Intent: Prevent unauthorized payments and shell access in payment agents.

Rules:
- Shell access is always denied
- Payment operations require identity verification
- Large refunds (>$5000) require approval
- Daily budget cap is $100,000

Use this pack when:
- Building payment processing agents
- Compliance requires audit trail
- Multi-tenant payment gateway
```

### fixtures/ (Test Cases)

```yaml
# tests/financial_saas_fixtures.yaml

fixtures:
  - name: "allow verified charge"
    tool: "stripe/charge"
    args: { amount: 3000 }
    principal:
      verified: true
      id: "agent-123"
    expected_effect: "permit"

  - name: "defer large refund"
    tool: "stripe/refund"
    args: { amount: 6000 }
    expected_effect: "defer"
    expected_reason: "large refunds require approval"

  - name: "deny shell for unverified"
    tool: "shell/run"
    args: { cmd: "echo test" }
    principal:
      verified: false
    expected_effect: "deny"
```

## 5. Pack Lifecycle Operations

### Check Current Status

```bash
faramesh pack status faramesh/financial-saas

# Output:
# Pack: faramesh/financial-saas
# Mode: ENFORCE
# Loaded At: 2026-05-11T12:00:00Z
# Decision Count: 847 (lifetime)
# Last Audit: 2026-05-11T14:23:00Z
```

### Test Pack Against Fixtures

```bash
faramesh pack test faramesh/financial-saas --fixtures tests/fixtures.yaml

# Output:
# Running 12 fixtures...
# ✓ allow verified charge
# ✓ defer large refund
# ✓ deny shell for unverified
# ✓ ... 9 more
# All tests passed
```

### Compare Packs

```bash
faramesh pack compare \
  faramesh/financial-saas \
  faramesh/startup-default

# Output:
# Differences:
# 1. startup-default denies more broadly (firewall approach)
# 2. financial-saas allows specific payment tools
# 3. startup-default has 5 rules; financial-saas has 12
```

### List Installed Packs

```bash
faramesh pack list

# Output:
# financial-saas (ENFORCE, 847 decisions)
# startup-default (SHADOW, 234 decisions)
# ai-safety (inactive)
```

### Update Pack

Fetch latest version from registry:

```bash
faramesh pack update faramesh/financial-saas

# Output:
# Updated financial-saas from v1.2 to v1.3
# Changes: 2 new rules, 1 deprecated rule
# Review policy before enforcing
```

## 6. Custom Pack Development

Create your own packs:

```bash
mkdir my-policy-pack
cd my-policy-pack

# Create policy
cat > policy.fpl <<'EOF'
agent custom-agent {
  default deny
  rules {
    permit http/get
    deny shell/*
  }
}
EOF

# Create test fixtures
cat > tests/fixtures.yaml <<'EOF'
fixtures:
  - name: "allow http"
    tool: "http/get"
    expected_effect: "permit"
EOF

# Validate
faramesh pack validate --path ./

# Package
faramesh pack create my-policy-pack --path ./ --version 1.0.0
```

### Publishing Packs

Distribute custom packs:

```bash
# Local file
faramesh pack use file:///path/to/my-policy-pack

# HTTP registry
faramesh pack use https://registry.internal/my-policy-pack

# Faramesh Hub (public)
faramesh pack publish my-policy-pack \
  --registry hub.faramesh.io \
  --public
```

## 7. Pack Customization Patterns

### Overlay Rules

Add rules on top of base pack:

```bash
faramesh pack shadow faramesh/financial-saas

# Create overlay
cat > overrides.fpl <<'EOF'
# Additions to financial-saas pack
permit shell/ls when principal.role == "auditor"
permit read_audit_log
EOF

faramesh pack shadow faramesh/financial-saas --overlay overrides.fpl
```

### Relax Restrictions

Soften a strict pack:

```bash
# Start with startup-default (very restrictive)
faramesh pack shadow faramesh/startup-default

# Create relaxation overlay
cat > production-exceptions.fpl <<'EOF'
# In production, allow these additional tools
permit stripe/charge when principal.verified == true
permit send_email when principal.role == "notifications"
EOF

faramesh pack shadow faramesh/startup-default \
  --overlay production-exceptions.fpl
```

### Combine Multiple Packs

Mix rules from multiple packs:

```bash
cat > combined.fpl <<'EOF'
# Combine financial-saas + ai-safety rules
agent payments-ai {
  default deny

  # From financial-saas
  rules {
    deny shell/*
    defer stripe/refund when args.amount > 5000
    permit stripe/charge when args.amount <= 5000
  }

  # From ai-safety
  rules {
    deny http/* when host matches "*.internal"
    permit http/* when host matches "api.openai.com"
  }
}
EOF

faramesh policy validate combined.fpl
```

## 8. Metrics and Decisions

Track policy decisions over time:

```bash
faramesh audit tail --filter "pack:financial-saas"

# Shows all decisions under this pack

faramesh metrics export --format prometheus

# Output includes:
# faramesh_pack_decisions_total{pack="financial-saas",effect="permit"} 847
# faramesh_pack_decisions_total{pack="financial-saas",effect="deny"} 31
# faramesh_pack_decisions_total{pack="financial-saas",effect="defer"} 12
```

## 9. Troubleshooting

### Pack Won't Load

**Error**: `policy validation failed`

**Check**:
```bash
faramesh pack validate faramesh/financial-saas --verbose

# Shows: syntax errors, expression compile failures, etc
```

### Shadow Mode Shows Too Many Denials

**Check policy**:
```bash
faramesh pack status faramesh/financial-saas --shadow-analysis

# Shows which rules are denying most often
```

**Fix**:
```bash
# Relax with overlay
faramesh pack shadow faramesh/financial-saas \
  --overlay my-exceptions.fpl
```

### Pack Update Breaks Existing Policy

**Safeguard**:
```bash
# Always test before enforcing
faramesh pack update faramesh/financial-saas
faramesh pack test faramesh/financial-saas --fixtures tests/fixtures.yaml
faramesh pack status --show-changes
# Review changes...
faramesh pack enforce faramesh/financial-saas
```

## 10. Production Checklist

- [ ] Appropriate pack selected for your use case
- [ ] Pack tested with your agent's actual tool calls
- [ ] Shadow analysis reviewed for 1+ hours
- [ ] Denials are understood and acceptable
- [ ] Defers are routed to appropriate approvers
- [ ] Custom overlays are validated
- [ ] Metrics are being collected
- [ ] Audit trail is enabled and monitored

## See Also

- [Policy Validation](/policies/overview/)
- [FPL Language](/policies/fpl-language/)
- [Observe-First Rollout Pattern](/guides/rollout-patterns/)
- [Policy Pack Catalog](https://hub.faramesh.io/packs/)
- [Faramesh Core Packs](https://github.com/faramesh/faramesh-core/tree/main/packs)
