---
title: Production Setup
description: A practical production checklist for running Faramesh with durable storage, monitoring, secret boundaries, and staged rollout.
---

# Production Setup

This page turns the core production checklist into a concrete deployment path for running Faramesh in a real environment.

## Minimum production requirements

1. Keep a dedicated policy file in version control.
2. Use a dedicated data directory and back it up.
3. Run Faramesh under a service manager or container supervisor.
4. Expose and monitor the `/metrics` endpoint.
5. Run regular `audit verify` checks.

## Recommended daemon command

```bash
faramesh serve \
  --policy /etc/faramesh/policy.yaml \
  --data-dir /var/lib/faramesh \
  --socket /var/run/faramesh.sock \
  --dpr-hmac-key <DPR_HMAC_KEY> \
  --metrics-port 9108 \
  --log-level info
```

If you do not pass `--dpr-hmac-key`, the daemon persists a generated key under the data directory as `faramesh.hmac.key`.

## Secret boundary setup

Use the credential broker to keep secrets out of the agent process by default.

### Local Vault provisioned by Faramesh

```bash
faramesh credential enable --policy /etc/faramesh/policy.fpl
faramesh up --policy /etc/faramesh/policy.fpl
faramesh run --broker --agent-id payments-prod -- python your_agent.py
```

### External Vault

```bash
faramesh credential enable \
  --policy /etc/faramesh/policy.fpl \
  --backend vault \
  --vault-addr https://vault.company.internal:8200 \
  --vault-token "$VAULT_TOKEN"

faramesh up --policy /etc/faramesh/policy.fpl
```

Operational helpers:

```bash
faramesh credential status
faramesh credential vault status
faramesh credential vault down
```

## Identity hardening

If you run SPIRE, point Faramesh at the SPIFFE Workload API socket:

```bash
faramesh serve \
  --policy /etc/faramesh/policy.yaml \
  --data-dir /var/lib/faramesh \
  --spiffe-socket unix:///run/spire/sockets/agent.sock
```

Then verify identity and trust material:

```bash
faramesh identity status
faramesh identity verify --spiffe spiffe://example.org/agent/faramesh
faramesh identity trust --domain example.org --bundle /etc/spiffe/bundle.pem
```

## Health and audit checks

```bash
faramesh status
faramesh approvals history --agent payments-prod
faramesh explain agent payments-prod
faramesh explain run <run-or-session-id>
faramesh audit verify /var/lib/faramesh/faramesh.wal
faramesh audit show <action-id>
```

## Pack rollout pattern

```bash
faramesh pack status faramesh/<pack>
faramesh pack shadow faramesh/<pack>
# monitor coverage / audit outcomes
faramesh pack enforce faramesh/<pack>
```

## Observability backends

Use the same `/metrics` endpoint for common observability stacks:

- Prometheus / Grafana
- Datadog OpenMetrics
- New Relic Prometheus ingestion

## Horizon auth

```bash
faramesh auth login
faramesh auth status
faramesh serve --policy /etc/faramesh/policy.yaml --sync-horizon
```

## See also

- `faramesh-core/docs/simple/07_PRODUCTION_SETUP.md`
- `faramesh-core/README.md`
- `faramesh-core/docs/guides/DPR_HMAC_KEY.md`
