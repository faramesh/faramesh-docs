---
title: Faramesh Cloud
description: The organizational control plane for Faramesh. Fleet visibility, the approvals UI, the DPR replica, compliance reporting, and the registry, never in the enforcement path.
---

Faramesh Cloud is the **organizational control plane** for Faramesh. It does not run enforcement. It is not a hosted version of the daemon.

The daemon, the policy engine, the WAL, and the credential broker run on **your** infrastructure, permanently and unconditionally. Faramesh Cloud is everything adjacent to enforcement that benefits from being centralized: indexed DPR storage, the approvals UI for people without CLI access, the policy and provider registry, and fleet visibility across many stacks.

If Faramesh Cloud goes down, every governed agent in your organization keeps running normally.

## What lives where

```text title="Output"
┌────────────────────────────────────────────────────────────────┐
│                    Your infrastructure                          │
│                                                                 │
│   CLI · daemon · policy AST · WAL · credential broker          │  ← enforcement truth
│   identity providers · KMS · audit sinks                        │
│                                                                 │
└──────────────────────────────┬─────────────────────────────────┘
                               │  outbound, batched, async
                               │  DPR records (post-redaction)
                               │  health metrics, pending approvals
                               ▼
┌────────────────────────────────────────────────────────────────┐
│                    Faramesh Cloud                               │
│                                                                 │
│   DPR replica (queryable, long-retention)                       │
│   Approvals UI · Fleet view · Compliance reports                │
│   Registry (providers / packs / framework profiles)             │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

The sync channel is **outbound only** from your infrastructure. Cloud cannot reach into the daemon. It cannot modify policy. It cannot issue credentials. The daemon decides every permit and deny by itself, and writes the DPR locally before the call completes.

## Why the enforcement path stays local

Three reasons that are non-negotiable.

### 1. Local fsync-before-permit

The DPR fsync is part of the permit path. If Cloud were in that path, every governed tool call would carry a network round-trip, 50–200 ms of added latency, plus a hard availability dependency on Cloud's uptime for your production agents. That is unacceptable.

### 2. Regulated workloads cannot route actions through a third-party cloud

A healthcare system governing agents that touch PHI cannot send pre-execution tool-call content to a vendor cloud before deciding whether to permit. Air-gapped deployments are a real and required customer segment.

### 3. Enforcement authority must not depend on internet connectivity

If enforcement lives in Cloud, your governance guarantee is only as strong as your internet connection and our SLA. That's not a guarantee, that's a dependency.

So: **enforcement stays local, always.**

## What Cloud is

Cloud is four things, clearly separated.

### Observability plane

The daemon optionally streams DPR records outbound to Cloud after they've been written to the local WAL. The WAL is still the source of truth. Cloud is an indexed, queryable, long-retention replica that gives you cross-stack visibility and search that would be impractical to run locally across many stacks.

### Approvals plane

When a `defer` decision is pending and the approver doesn't have CLI access, Cloud is the approval interface. The daemon pushes pending approvals to Cloud over the sync channel. Approvers act via the web UI. Cloud pushes the decision back to the daemon. The daemon records the approval as a DPR update. The enforcement path is still the daemon. Cloud just routes the human decision.

### Registry

Policy packs, provider binaries, framework profiles. Globally accessible, versioned, signed. See [Registry](/registry/).

### Fleet control plane

Organizations running multiple stacks see all of them in one place, status, health, pending approvals, budget burn, recent decisions, aggregated.

## The sync channel

The sync channel is:

- **Established from the daemon side.** Outbound only from your infrastructure. No inbound connections from Cloud to your network.
- **Authenticated via a stack API key** provisioned at registration time.
- **Encrypted** (TLS 1.3 minimum).
- **Asynchronous and buffered.** DPR records batch-sync on a configurable interval, not per-record. A slow or unavailable Cloud causes records to queue locally and sync when the channel recovers.
- **Fully degradable.** If the channel is down, the daemon logs the condition and continues enforcement. No alert suppression. No enforcement degradation.

| Direction | Payload |
|-----------|---------|
| Daemon → Cloud | DPR records (post-redaction), pending approval events, daemon health metrics, stack status, credential expiry events, budget state snapshots. |
| Cloud → Daemon | Approval decisions, notification configuration updates, registry pack version alerts. **Nothing that affects enforcement policy.** The `governance.fms` file and the daemon's compiled policy are never modified by Cloud. |

The one exception to "Cloud cannot reach the daemon": **emergency kill switches** for operators without CLI access. The daemon polls Cloud on a short interval (default 30 s) for emergency commands. Only two command types are accepted:

- **Agent kill**, terminate sessions for a named agent.
- **Agent isolate**, put a named agent into shadow mode.

Both are recorded as DPR events. Both require platform admin role. No other command can flow Cloud → daemon. `faramesh agent kill` from the CLI remains the immediate path for engineers with terminal access.

## Navigation

Six primary sections. Everything is scoped to an organization. Stack context is a filter, not a navigation step.

### 1. Home

The operational entry point. Designed to answer in one view: is anything wrong right now, and what needs my attention?

| Element | Content |
|---------|---------|
| **Attention required** | Pending approvals with age, agents with active alerts, stacks with sync disconnected, credentials expiring in the next 24 h, budgets within 10% of breach. Each item links to the relevant action. Empty panel = healthy. |
| **Fleet health strip** | Total stacks registered, breakdown by health status. Each number links to the filtered fleet view. |
| **Activity stream** | Last 100 DPR records across the org, live-updating. Click any record to open the explain view. |
| **Budget burn** | Aggregate consumption for the period, per-stack bars. Stacks within 20% of ceiling highlighted. |

### 2. Fleet

Every governed agent system in the organization.

**Stack list**, table of all registered stacks. Columns: name, environment label, framework, last apply timestamp, git commit hash (linked), daemon version, sync status, agent count, enforcement depth (seccomp / Landlock / eBPF / Firecracker), health.

**Stack detail tabs:**

| Tab | Contents |
|-----|----------|
| Overview | Daemon uptime, platform, active enforcement layers, sync status, agent count, last apply summary, active alerts. |
| Agents | Per-agent budgets, active sessions, recent decisions by effect, credential expiry. Drill into agent detail. |
| Agent detail | Identity, budget breakdown, sessions, last 200 DPRs, brokered credentials, delegation topology, enforcement layers, **Kill** and **Isolate** emergency controls. |
| Config | Read-only display of the applied `governance.fms` with its git commit. Drift detection against the main branch when git is connected. |
| Apply history | Every `faramesh apply` operation: timestamp, operator, commit hash, change summary. Rollback shows the CLI command to run; Cloud does not push config. |
| Providers | All declared providers with health, last successful operation, identity-verification timestamps. |
| Integrations | Stack-specific notification routing, observability destinations. |

### 3. Approvals

The human-in-the-loop interface for people without CLI access.

| Element | Contents |
|---------|----------|
| **Pending queue** | All pending defers across the fleet, oldest first. Color-coded by age (green < 5 min, yellow 5–30, red > 30). Filterable by stack, agent, tool. |
| **Approval detail** | Identity, session context, exact tool + post-redaction args, the rule that matched and why, budget state, the agent's last 20 actions in this session, link to the full session explorer. **Approve** and **Deny** with mandatory reason. |
| **Bulk actions** | Multi-select on the same agent / tool / rule pattern; one reason for all. |
| **History** | Resolved approvals, approver, time, reason, pending duration, link to the DPR. |
| **Routing** | Per-stack and per-agent: which users / groups receive notifications and via which channel (Slack, PagerDuty, email, webhook). Escalation rules with time thresholds. |

### 4. Audit

The DPR explorer. Not a log viewer, a cryptographically verified decision-record explorer.

| Element | Contents |
|---------|----------|
| **Live stream** | Real-time DPRs across all stacks, filterable. The browser equivalent of `faramesh audit tail`. |
| **Search** | Query across all retained DPRs. Filter by stack, agent, session, effect, action type, tool, rule, time range. Export as a signed JSON bundle. |
| **Explain view** | Full decision trace for one DPR, identity at call time, session context, args (post-redaction), rules evaluated, matching rule and effect, credential actions, latency breakdown, chain position. **Verify** button re-checks the hash and chain link. |
| **Session explorer** | Enter a session id; see the full chronological timeline. For multi-agent pipelines, all DPRs across all participating agents correlated by the propagated session id. |
| **Chain integrity** | Per-stack: last verified timestamp, chain length, segment count, archive status, any detected gaps or hash mismatches. A mismatch is a **critical alert**, auditors check this view. |

### 5. Compliance

Reporting and evidence for regulated environments.

| Element | Contents |
|---------|----------|
| **Posture dashboard** | Continuous mapping of DPR evidence and policy declarations to the controls of the frameworks you've declared (SOC 2 Type II, HIPAA, PCI DSS, ISO 27001, GDPR). Per control: covered by evidence / covered by policy / gap. |
| **Report generation** | Time range + stacks + framework. Output is a signed PDF: executive summary, chain integrity certificate, policy coverage analysis, decision statistics, approval workflow summary, full signed DPR export as appendix. PDF carries a verification hash; the appendix is signed by the platform key. |
| **Evidence library** | All generated reports, signed exports, integrity certificates. Time-limited shareable links for auditors, they don't need a Cloud account. |
| **Coverage analysis** | Which agents have full policy coverage, partial, or gap. Click a gap to see the tool, the agent, the call count for the period, and a suggested FPL snippet. |

### 6. Registry

The artifact store. See [Registry](/registry/) for the full catalog model. In Cloud:

- **Browse providers**, catalog with capability tags, supported platforms, config schema, version history, signed-or-community status, download counts.
- **Browse policy packs**, searchable by domain (payments, healthcare, code execution, …) with rule preview, required configuration checklist.
- **Browse framework profiles**, by framework name, with the import snippet ready to copy.
- **Publish**, for registered publishers. Provider binary upload (signing flow runs an `Init` smoke test in a sandbox before signing). Policy pack and framework profile submission with review queue.
- **My artifacts**, usage counts, version history, issue reports.

### 7. Settings

| Section | Contents |
|---------|----------|
| **Organization** | Name, slug, billing plan, SSO (OIDC) configuration, attribute mapping. |
| **Members** | Invite, remove, roles. **Owner** (full access), **Admin** (no billing or SSO), **Operator** (approvals, audit, compliance, kill/isolate), **Auditor** (read-only on audit and compliance, can download reports), **Viewer** (fleet health only). Per-stack role overrides for cross-stack isolation. |
| **Stacks** | Register a new stack (generates the API key + the `runtime { ... }` snippet to paste into `governance.fms`), deregister (retains historical DPRs per retention policy), rotate API keys, environment labels. |
| **Integrations** | **Git providers** (GitHub, GitLab, Bitbucket, Azure DevOps) for commit linking and drift detection. **Notification destinations** (Slack workspaces via OAuth, PagerDuty service keys, email groups, generic webhooks) reusable across stacks. **External observability**. Datadog, Grafana Cloud (OTLP), Splunk HEC, Elastic, generic OTLP. The daemon ships to Cloud; Cloud forwards to your observability platform. **Webhook endpoints** with signing secrets. |
| **Retention** | Cloud-side DPR retention. Separate from the local WAL retention configured in `governance.fms`. Compliance plans have mandatory minimums. |
| **Config Assistant** | A guided form that generates `governance.fms` snippets, pick a block type, fill in fields, copy the output. Cloud does **not** push the change; you commit it and run `faramesh apply` yourself. |
| **API keys** | Programmatic platform access. CI/CD integrations, automated report generation, external tooling. Scoped by role. |
| **Billing** | Plan, usage (connected stacks, ingested DPRs/month, reports generated, registry storage), invoices. Billing unit is governed decisions, not infrastructure resources. |
| **Platform audit log** | Every action taken in the Cloud UI or via the Cloud API: logins, approvals, reports, settings changes, registrations, emergency controls, API key operations. **Separate from the agent DPR chain.** Exportable. |

## What Cloud explicitly is not

| It is not | Why |
|-----------|-----|
| A configuration editor | `governance.fms` lives in your version control. Cloud reads it via the git integration; it does not edit it. |
| A code deployment tool | `faramesh apply` runs from your CLI or CI/CD. Cloud reports results; it does not trigger applies. |
| In the enforcement path | Cloud cannot push policy changes, cannot issue credentials, cannot approve a decision the daemon hasn't surfaced. A compromised Cloud account is a visibility problem, not a governance bypass. |
| A replacement for the CLI | The CLI is the primary interface for engineers. Cloud is the interface for approvers, compliance officers, auditors, and operators without terminal access. Both are first-class. |
| A SaaS daemon | The daemon stays local. Always. |
| A workflow builder, agent IDE, or graph toy | None of those have anything to do with governance. |

## When Cloud is not needed

You govern one stack. You are the operator. You have CLI access. You check `faramesh status` in your terminal. You review `faramesh audit tail` when something happens. Approvals come to you and you run `faramesh approvals approve` from the CLI. One team, one stack, one engineer.

The CLI does everything you need locally. Cloud adds nothing here.

## When Cloud becomes necessary

Any **one** of these forcing functions justifies it:

1. **Multiple people need visibility without CLI access.** Compliance officers, security reviewers, engineering managers. None should SSH into the production host.
2. **Multiple stacks need to be seen in one place.** Five teams, five governance stacks, five daemons across five hosts. `faramesh status` shows one stack at a time.
3. **Approvals need to reach people who don't have CLI access.** The defer workflow works locally. The moment the right approver isn't the one with the terminal, the local workflow breaks.
4. **Long-term DPR retention and compliance reporting.** The local WAL is durable but not designed for queryable retention across 18 months and 6 stacks. The Cloud replica is.

## Deployment models

| Model | Where it runs | When to choose |
|-------|---------------|----------------|
| **Cloud-hosted** | Faramesh-operated, US-East / US-West / EU-Central regions. | Default. Your daemon syncs to our hosted instance. |
| **Self-hosted** | Helm chart in your VPC. Same codebase, same UI, your hardware. | Defense, healthcare, financial services, sovereignty-sensitive deployments, air-gapped agents. |

In both models, the daemon is the same. Only the sync target changes.

## Pricing

- **Local runtime, CLI, every interception tier**, free and open-source forever.
- **Cloud**, per seat for approvers/operators, plus a usage tier on ingested DPR volume for high-throughput projects.
- **Self-hosted Cloud**, annual license, includes priority support and a registry mirror.

## What's next

- [Quickstart](/quickstart/): get the runtime running first; pair to Cloud later
- [Auditing](/concepts/auditing/): the DPR stream Cloud indexes
- [Approvals → CLI](/cli/#approvals): the approval workflow Cloud puts a UI on
- [Registry](/registry/): the artifact store
