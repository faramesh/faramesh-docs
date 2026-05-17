---
title: Auditing agent decisions
description: A security-focused guide to DPR verification, compliance exports, and evidence workflows with Faramesh.
---

Security and GRC teams care about **what the agent did**, **under which policy**, and **whether records were tampered with**—not about LangGraph nodes.

## What to collect

| Artifact | Location | Purpose |
|----------|----------|---------|
| `governance.fms` + compiled JSON | Repo / CMDB | Policy intent and version |
| WAL / DPR chain | `.faramesh/` on host | Per-decision evidence |
| Provider manifests | Import pins in FPL | Binary provenance |
| Approval records | CLI / Cloud UI | Human-in-the-loop proof |

## Verify integrity offline

```bash
faramesh audit verify --stack ./my-stack
```

This replays hash linkage and signature checks using keys in `trust { ... }` and optional KMS configuration. See [Auditing](/concepts/auditing/) and [KMS](/concepts/kms/).

## Map to control frameworks

| Control theme | Faramesh mechanism |
|---------------|-------------------|
| Least privilege | Default deny + explicit `permit` rules |
| Segregation of duties | `defer` + approvals over thresholds |
| Credential protection | Provider-brokered short-lived secrets |
| Logging integrity | Hash-chained DPR, external KMS sign |
| Change management | Pinned catalog imports, `faramesh plan` diffs |

Regulated packs (PCI-style redaction, retention) can be composed from catalog policy imports; author org-specific packs in your fork.

## Monitoring

- Export DPR to your SIEM via provider sinks (catalog) or batch export jobs.
- Alert on `POLICY_DENY` spikes and repeated `POLICY_DEFER` timeouts.
- Correlate `agent_id` and `tool` fields in DPR JSON to CMDB owners.

## Related

- [Security model](/security/)
- [Registry policies](/registry/policies/)
- [Offboarding](/guides/offboarding/)
