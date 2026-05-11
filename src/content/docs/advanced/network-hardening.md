---
title: Network Hardening
description: Progressive rollout patterns for network-layer policy enforcement with canary gates and audit-first validation.
---

Network hardening restricts which external hosts and ports agents can connect to, preventing data exfiltration, credential theft, and unauthorized API calls. Faramesh supports an audit-first, canary-gated rollout pattern that validates policy against live traffic before any enforcement.

## Use Cases

- **LLM safety**: Restrict agents to approved API providers (OpenAI, Anthropic, etc.)
- **Data loss prevention**: Block connections to unapproved cloud storage and third-party services
- **Compliance isolation**: Ensure PCI or HIPAA workloads only reach approved backends
- **Supply chain security**: Prevent dependency injection attacks through network isolation

## 1. How Network Hardening Works

### Rules Block Connections

Network hardening rules match on:

```fpl
agent llm-agent {
  rules {
    # Allow only OpenAI and Anthropic APIs
    permit http/get when host matches "api.openai.com"
    permit http/post when host matches "api.anthropic.com"

    # Block everything else
    deny http/*

    # Allow internal metrics
    permit http/* when host matches "metrics.internal"
  }
}
```

### Progressive Validation

Before enforcement, validate policy against real traffic:

```
Stage 1: AUDIT
  └─ Record all network calls without blocking
  └─ Analyze which calls would be denied
  └─ Collect metrics

Stage 2: CANARY (10% of traffic)
  └─ Enforce on subset for early warning
  └─ Monitor deny rate
  └─ If OK, proceed to next stage

Stage 3: ENFORCE (100% of traffic)
  └─ Policy is now active
  └─ Denials are actual denials
```

## 2. Audit-First Canary

### Run a Canary

Execute a 5-minute audit canary against real or simulated traffic:

```bash
bash scripts/network_hardening_canary.sh \
  --policy policies/default.fpl \
  --duration 300 \
  --traffic-cmd "bash tests/socket_e2e_acceptance.sh" \
  --max-audit-violations 50 \
  --max-audit-bypass 0 \
  --max-network-deny 0
```

**Parameters**:

| Param | Meaning |
|-------|---------|
| `--policy` | FPL policy file to test |
| `--duration` | Run time in seconds |
| `--traffic-cmd` | Shell command that generates traffic |
| `--max-audit-violations` | Threshold: max unexpected audit decisions |
| `--max-audit-bypass` | Threshold: max policy bypasses (strict: 0) |
| `--max-network-deny` | Threshold: max network denials in audit |

### Canary Output

```json
{
  "stage": "canary-audit",
  "mode": "audit",
  "status": "PASS",
  "duration_seconds": 300,
  "metrics": {
    "audit_violations": 23,
    "audit_bypass": 0,
    "network_deny": 0,
    "decisions_permit": 847,
    "decisions_deny": 31
  },
  "thresholds": {
    "max_audit_violations": 50,
    "max_audit_bypass": 0,
    "max_network_deny": 0
  },
  "artifacts": {
    "daemon_log": ".tmp/network-hardening/daemon.log",
    "traffic_log": ".tmp/network-hardening/traffic.log",
    "metrics": ".tmp/network-hardening/metrics.json"
  }
}
```

**Status**: `PASS` means policy is safe to test with real enforcement

### Canary Thresholds

Typical thresholds for audit canary:

- `max-audit-violations`: 50 (known misses are OK in audit)
- `max-audit-bypass`: 0 (strict — no unauthorized escapes)
- `max-network-deny`: 0 (in audit mode, shouldn't block anything)

## 3. Progressive Enforcement Rollout

### Stage Manifest

Create a CSV file defining rollout stages:

```csv
name,mode,policy,duration,max_network_deny,max_audit_violations,max_audit_bypass
canary-audit,audit,policies/default.fpl,300,0,50,0
staging-enforce-10,enforce,policies/staging_enforce_10.fpl,300,15,200,10
staging-enforce-50,enforce,policies/staging_enforce_50.fpl,300,25,200,10
prod-enforce-10,enforce,policies/prod_enforce_10.fpl,300,20,200,10
prod-enforce-50,enforce,policies/prod_enforce_50.fpl,300,30,200,10
prod-enforce-100,enforce,policies/prod_enforce_100.fpl,300,40,200,10
```

**Recommended strategy**:

1. **Stage 1**: Audit canary with strict bypass gate
2. **Stage 2-3**: Enforce on staging (10% → 50%) with relaxed thresholds
3. **Stage 4-6**: Enforce on production (10% → 50% → 100%) with progressive gates

### Execute Rollout

```bash
bash scripts/network_hardening_progressive_rollout.sh \
  --stage-file scripts/network_hardening_rollout_stages.example.csv \
  --traffic-cmd "make smoke-proxy" \
  --run-dir .tmp/network-hardening/rollout
```

**Behavior**:
- Runs each stage sequentially
- Stops immediately on first failure
- Generates per-stage JSON report
- Exits with non-zero status on any failure

**Continue without stopping**:

```bash
bash scripts/network_hardening_progressive_rollout.sh \
  --stage-file stages.csv \
  --traffic-cmd "make smoke-proxy" \
  --continue-on-fail
```

### Stage Progression

```
Initial: canary-audit
  ↓
  [Manual gate: review canary report]
  ↓
staging-enforce-10  (enforce on 10% of traffic)
  ↓
  [Metrics OK? Continue]
  ↓
staging-enforce-50  (enforce on 50% of traffic)
  ↓
  [Metrics OK? Continue]
  ↓
prod-enforce-10     (enforce on 10% of production)
  ↓
  [On-call signoff? Continue]
  ↓
prod-enforce-50     (enforce on 50% of production)
  ↓
  [Is production stable? Continue]
  ↓
prod-enforce-100    (enforce 100% of traffic)
```

## 4. Private Egress Exceptions

For agents that legitimately need private network access:

```bash
bash scripts/network_hardening_canary.sh \
  --policy policies/default.fpl \
  --duration 300 \
  --traffic-cmd "bash tests/socket_e2e_acceptance.sh" \
  --allow-private-cidrs "10.0.0.0/8,172.16.0.0/12" \
  --allow-private-hosts "internal.api.local,metadata.service.consul"
```

**Parameters**:

| Param | Meaning |
|-------|---------|
| `--allow-private-cidrs` | Comma-separated CIDR blocks (RFC1918, etc.) |
| `--allow-private-hosts` | Comma-separated hostnames |

**Impact**: Exceptions are applied to all stages in that rollout run

## 5. Built-in Policy Stages

Faramesh bundles staged enforcement policies for common scenarios:

### Baseline Policies

```
policies/
├── default.fpl                    # Starting point (audit)
├── staging_enforce_10.fpl         # 10% enforce in staging
├── staging_enforce_50.fpl         # 50% enforce in staging
├── prod_enforce_10.fpl            # 10% enforce in production
├── prod_enforce_50.fpl            # 50% enforce in production
└── prod_enforce_100.fpl           # 100% enforce in production
```

### API Provider Allowlists

Builtin policies include graduated allowlists:

**OpenAI**:
```fpl
# All stages
permit http/post when host matches "api.openai.com" && \
  path matches "/v1/chat/completions"

# Staging 50% + prod
permit http/post when host matches "api.openai.com" && \
  path matches "/v1/embeddings"

# Prod 100% only
permit http/get when host matches "api.openai.com" && \
  path matches "/v1/models"
```

**Anthropic**:
```fpl
permit http/post when host matches "api.anthropic.com" && \
  path matches "/v1/messages"
```

**Azure OpenAI**:
```fpl
# Prod 100% only
permit http/post when host matches "*.openai.azure.com" && \
  path matches "/openai/deployments/*/chat/completions"
```

### Customizing Policies

Edit policies before rollout:

```bash
# Copy default to custom
cp policies/default.fpl policies/my-policy.fpl

# Add your approved hosts
cat >> policies/my-policy.fpl <<'EOF'

agent my-agent {
  rules {
    # Add your internal APIs
    permit http/* when host matches "api.internal"
    permit http/* when host matches "wal-*.internal"
  }
}
EOF

# Use custom policy in stages
sed 's|policies/default.fpl|policies/my-policy.fpl|g' \
  scripts/network_hardening_rollout_stages.example.csv > my-stages.csv
```

## 6. Failure Playbook

### Canary Fails

**Symptom**: Canary exits with `status: FAIL`

**Action**:
```bash
# Inspect failed checks
cat .tmp/network-hardening/report.json | jq '.failed_checks'

# Review daemon log
tail -100 .tmp/network-hardening/daemon.log

# Common reasons:
# 1. Policy syntax error
# 2. Unexpected audit violations (not in baseline)
# 3. Audit bypass detected

# Fix the issue
vim policies/default.fpl

# Re-run canary
bash scripts/network_hardening_canary.sh --policy policies/default.fpl ...
```

### Stage Fails During Progressive Rollout

**Action**:
1. Inspect per-stage report JSON
2. Check deny delta (`network_deny` metric)
3. Review daemon logs for reason codes
4. Rollback to previous stage (or to audit)
5. Fix policy and restart from earlier stage

**Rollback example**:
```bash
# If staging-enforce-50 fails, go back
bash scripts/network_hardening_progressive_rollout.sh \
  --stage-file stages.csv \
  --traffic-cmd "make smoke-proxy" \
  --start-stage staging-enforce-10    # Resume from here
```

### Unexpected Denials in Production

**Action**:
1. Stop further rollout
2. Investigate denied connections in audit log
3. Update policy with exception
4. Test in staging with new policy
5. Resume rollout with updated stages

**Query denied connections**:
```bash
faramesh audit tail --filter "effect:deny" | \
  grep "network_deny\|proxy" | \
  head -20
```

## 7. Metrics and Reporting

### Key Metrics

Track these during rollout:

| Metric | Normal Range | Alert Threshold |
|--------|--------------|-----------------|
| `network_deny` | < 1% of traffic | > 5% deny rate |
| `audit_violations` | < 2% | > 5% violations |
| `audit_bypass` | 0 | > 0 (any bypass) |
| `http_latency_p99` | < 500ms | > 1s (post-hardening) |
| `error_rate` | < 0.1% | > 0.5% |

### Export Metrics

```bash
# Export metrics from report
cat .tmp/network-hardening/report.json | jq '.metrics'

# Export to Prometheus format
faramesh metrics export --format prometheus | \
  grep "network_"

# Export to CloudWatch
faramesh metrics export --format json | \
  aws cloudwatch put-metric-data --namespace Faramesh --metric-data file:///dev/stdin
```

## 8. Rollback

### Stage Rollback

If a stage fails:

```bash
# Option 1: Restart from previous stage
bash scripts/network_hardening_progressive_rollout.sh \
  --stage-file stages.csv \
  --start-stage staging-enforce-10 \
  --traffic-cmd "make smoke-proxy"
```

### Complete Rollback

If enforcement causes production issues:

```bash
# Revert to audit mode
vim policies/prod_enforce_100.fpl
# Change all "deny" and "permit" to "audit_log"

# Or: completely disable
faramesh policy reload --policy policies/audit-only.fpl

# Monitor metrics return to normal
watch 'faramesh metrics export | grep network_deny'
```

## 9. Production Checklist

- [ ] Canary completed successfully (status: PASS)
- [ ] Canary metrics reviewed and approved
- [ ] Stage policies customized for your agents
- [ ] API allowlists include all approved providers
- [ ] Private network exceptions configured
- [ ] Staged rollout manifest ready
- [ ] Traffic generation command is representative
- [ ] Rollback plan documented
- [ ] On-call team briefed on expected metrics
- [ ] Monitoring alerts configured for deny-rate spikes

## 10. Troubleshooting

### Canary Script Not Found

**Error**: `scripts/network_hardening_canary.sh: No such file or directory`

**Fix**:
```bash
# Ensure you're in faramesh-core repo root
cd faramesh-core

# Scripts are in repo
ls -la scripts/network_hardening*.sh
```

### Traffic Command Fails

**Error**: `--traffic-cmd exited with status 1`

**Fix**:
```bash
# Test traffic command independently
bash tests/socket_e2e_acceptance.sh

# Or use a simpler command
--traffic-cmd "sleep 10"
```

### Policy Syntax Error

**Error**: `policy compilation failed`

**Fix**:
```bash
# Validate policy manually
faramesh policy validate policies/my-policy.fpl

# Check for FPL syntax
faramesh policy fpl yaml policies/my-policy.fpl
```

## See Also

- [FPL Language](/policies/fpl-language/)
- [Policy Packs](/policies/policy-packs/)
- [Production Setup](/deployment/self-hosted/)
- [Faramesh Core Network Hardening](https://github.com/faramesh/faramesh-core/blob/main/docs/guides/NETWORK_HARDENING_CANARY_RUNBOOK.md)
