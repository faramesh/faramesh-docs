---
title: SPIFFE Workload Identity
description: Cryptographic workload identity for agents using SPIFFE SVIDs and SPIRE infrastructure.
---

SPIFFE (Secure Production Identity Framework for Everyone) provides cryptographic identity to software workloads using SVIDs (SPIFFE Verifiable Identity Documents). Faramesh integrates with SPIFFE/SPIRE infrastructure to bind agent identity to policy, enabling identity-aware governance.

## Why Workload Identity Matters

Without workload identity:

```python
# Who is this agent really?
agent_id = os.getenv("AGENT_ID")  # Could be spoofed
# Is it verified?  # No guarantees
```

With SPIFFE:

```bash
# Agent has cryptographic identity from SPIRE
# SVID is a short-lived X.509 certificate
# Faramesh can verify signature and bind identity to policy
faramesh identity status
# Output: spiffe://example.org/agent/payment-processor (verified)
```

## 1. Architecture

### SPIFFE/SPIRE Components

```
┌──────────────────────────────────┐
│ SPIRE Infrastructure             │
│ ┌────────────┐  ┌────────────┐   │
│ │ CA         │  │ Server     │   │
│ │ (root)     │  │ (trusted)  │   │
│ └────────────┘  └────────────┘   │
└─────────────┬──────────────────┘
              │
     ┌────────┴────────┐
     │                 │
┌────▼─────────────┐   │
│ SPIRE Agent      │   │
│ (workload API)   │   │
└────┬─────────────┘   │
     │                 │
     │ Unix Socket     │
     │ /run/spire/...  │
     │                 │
┌────▼──────────────────────────┐
│ Faramesh Daemon               │
│ ┌───────────────────────────┐ │
│ │ SVID Verifier             │ │
│ │ • Fetch SVID              │ │
│ │ • Verify signature        │ │
│ │ • Bind to principal       │ │
│ └───────────────────────────┘ │
└───────────────────────────────┘
```

### Identity Binding Flow

1. **Workload startup**: Agent process starts
2. **SVID fetch**: Faramesh daemon connects to SPIRE Agent via Unix socket
3. **Identity resolution**: Daemon receives short-lived SVID certificate
4. **Signature verification**: Daemon verifies SVID was signed by trusted CA
5. **Policy binding**: `principal.verified == true` in policy expressions
6. **Governance enforcement**: Policy rules can now reference verified identity

## 2. Setting Up SPIFFE/SPIRE

### SPIRE Installation

Install SPIRE on your infrastructure:

```bash
# SPIRE server (runs once per infrastructure)
curl -s https://storage.googleapis.com/spire-releases/spire/latest/spire-linux-glibc-x86_64.tar.gz | \
  tar xz -C /opt
/opt/spire/bin/spire-server run -config /etc/spire/server.conf

# SPIRE agent (runs on each host)
/opt/spire/bin/spire-agent run -config /etc/spire/agent.conf
```

### SPIRE Agent Configuration

Configure SPIRE Agent to expose Workload API:

```conf
# /etc/spire/agent.conf

agent {
  data_dir = "/var/lib/spire/agent"
  log_level = "INFO"
  server_address = "spire-server.internal"
  server_port = 8081
  trust_domain = "example.org"
  insecure_bootstrap = false
}

plugins {
  NodeAttestor "x509pop" {
    plugin_data {
      cert_file = "/opt/spire/certs/node_cert.pem"
      key_file = "/opt/spire/certs/node_key.pem"
    }
  }
}
```

## 3. Configuring Faramesh with SPIFFE

### Daemon Configuration

```bash
faramesh serve \
  --policy /etc/faramesh/policy.fpl \
  --spiffe-socket unix:///run/spire/sockets/agent.sock \
  --trust-domain example.org
```

### Environment Variables

```bash
export FARAMESH_SPIFFE_ID="spiffe://example.org/agent/faramesh"
export SPIRE_SOCKET="unix:///run/spire/sockets/agent.sock"

faramesh serve --policy /etc/faramesh/policy.fpl
```

### Policy Configuration

Reference SPIFFE identity in policy:

```fpl
agent payment-processor {
  default deny

  # Only verified agents can access this
  rules {
    deny stripe/* when principal.verified != true
    deny read_customer when principal.verified != true

    permit stripe/refund when principal.verified == true && args.amount <= 1000
    permit read_customer when principal.verified == true
  }
}
```

## 4. Identity-Aware Policy

### Principal Verification

Check if workload identity is cryptographically verified:

```fpl
# Require verified identity for sensitive operations
deny stripe/refund when principal.verified != true

permit stripe/refund when principal.verified == true && args.amount <= 500
```

### Principal Attributes

Access verified identity attributes in policy:

```fpl
agent multi-tenant {
  rules {
    # Gate by organization from SPIFFE trust bundle
    permit read_customer when principal.org == "acme-corp"

    # Gate by role embedded in SVID
    defer stripe/charge when principal.role != "payments_processor"

    # Gate by tier
    deny admin_* when principal.tier == "untrusted"
  }
}
```

### Delegation Chain Verification

Check delegation depth and origin:

```fpl
agent orchestrator {
  rules {
    # Only allow sub-agents from verified origins
    deny * when delegation.depth > 1 && !delegation.agent_identity_verified

    # Restrict depth
    deny * when delegation.depth > 5

    # Allow specific delegations
    permit stripe/* when delegation.origin_agent == "payment-supervisor"
  }
}
```

## 5. Running with SPIFFE Identity

### Using Faramesh Run

```bash
# Agent inherits SPIFFE identity from SPIRE
FARAMESH_SPIFFE_SOCKET=/run/spire/sockets/agent.sock \
FARAMESH_SPIFFE_ID="spiffe://example.org/agent/my-agent" \
faramesh run -- python your_agent.py
```

### Verifying Identity

```bash
faramesh identity status

# Output:
# SPIFFE ID: spiffe://example.org/agent/my-agent
# Verified: true
# Trust Domain: example.org
# SVID Expires: 2026-05-11T14:23:45Z
```

### Trust Bundle Management

```bash
# View trust bundles
faramesh identity trust --show-bundles

# Add trust bundle for federation
faramesh identity trust --domain other-org.internal \
  --bundle /path/to/bundle.pem

# Verify signature with bundle
faramesh identity verify \
  --spiffe spiffe://other-org.internal/agent/partner-agent \
  --bundle /path/to/bundle.pem
```

## 6. Multi-Org Federation

Enable identity federation across organizations:

```bash
# Trust an external org's SPIFFE domain
faramesh identity trust \
  --domain partner-org.internal \
  --bundle /etc/spiffe/partner-bundle.pem

# Policy can now reference cross-org identity
agent orchestrator {
  rules {
    permit stripe/* when \
      principal.id matches "spiffe://partner-org.internal/agent/.*" && \
      principal.verified == true
  }
}
```

## 7. Workload API Details

### SVID Lifecycle

SVIDs are short-lived X.509 certificates:

```bash
# SVID properties
# Subject: CN=spiffe://example.org/agent/payment-processor
# Validity: 1 hour (default, configurable)
# CA: SPIRE Server's intermediate CA
# Extensions: Contains workload metadata

# Faramesh automatically:
# 1. Fetches fresh SVID from SPIRE Agent
# 2. Verifies signature against trust bundle
# 3. Extracts identity attributes
# 4. Refreshes before expiration
```

### Workload API Socket

Faramesh connects to SPIRE Agent's Workload API socket:

```bash
# Default socket path
/run/spire/sockets/agent.sock

# Socket permissions (SPIRE Agent sets these)
srwxrwx------ (SPIRE Agent is owner)

# Faramesh daemon must have read/write access
# (typically achieved via group membership or same user)
```

### Fetch Timeout

Workload API calls have timeout:

```bash
# Default: 5 seconds
# Configure via environment:
export FARAMESH_SPIFFE_TIMEOUT=10s

faramesh serve --policy /etc/faramesh/policy.fpl
```

If SPIRE Agent is unavailable, Faramesh:
- Logs timeout/connection errors
- Continues with last known identity
- Marks principal as `verified: false` if no fresh SVID

## 8. Troubleshooting

### Identity Status Shows "Unverified"

**Check SPIRE Agent connectivity**:

```bash
# Verify socket exists and is accessible
ls -la /run/spire/sockets/agent.sock

# Check socket permissions
stat /run/spire/sockets/agent.sock | grep Access
```

**Check Faramesh logs**:

```bash
faramesh identity status --verbose

# Common errors:
# "socket connection refused" → SPIRE Agent not running
# "permission denied" → Faramesh doesn't have socket access
# "invalid trust bundle" → Trust anchor mismatch
```

### Policy Denies Verified Agents

**Check principal attributes**:

```bash
faramesh identity status --show-attributes

# Verify policy references correct attributes:
deny stripe/* when principal.org != "expected-org"
#                   ^^^^^^^^^^^^^^^ must match actual value
```

### SVID Refresh Failures

**Symptoms**: Identity becomes unverified after some time

**Root Cause**: SVID expired, refresh failed

**Fix**:
```bash
# Verify SPIRE Agent is healthy
spire-agent validate -config /etc/spire/agent.conf

# Increase log level for details
faramesh serve --log-level debug --policy policy.fpl
```

## 9. Production Checklist

- [ ] SPIRE infrastructure is deployed and healthy
- [ ] SPIRE Agent is running on all hosts with Faramesh
- [ ] Workload API socket is accessible to Faramesh daemon
- [ ] Trust bundles are installed for all federated organizations
- [ ] Policy references `principal.verified` for sensitive operations
- [ ] Policy references appropriate identity attributes (`principal.org`, `principal.role`)
- [ ] SVID refresh is working (test with a 1-minute TTL in dev)
- [ ] Cross-org delegation policies are tested

## See Also

- [Credential Sequestration](/identity/credential-sequestration/)
- [Delegation Grants](/advanced/delegation-grants/)
- [FPL Language: Expression Context](/policies/fpl-language/#13-when-expression-environment-complete)
- [SPIFFE Specification](https://spiffe.io/)
- [SPIRE Documentation](https://spiffe.io/docs/latest/spire-about/)
