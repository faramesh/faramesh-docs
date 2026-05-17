---
title: Faramesh Cloud
description: The hosted operator console for governed AI agents — orgs, fleet visibility, approvals, evidence, and policy lifecycle on top of the same runtime.
---

**Faramesh Cloud** is the commercial operator console for the same runtime you use locally. The daemon, policy engine, WAL, and providers are unchanged — Cloud adds an organization layer, multi-project visibility, an approvals UI, fleet management, and evidence indexing.

The runtime is the **enforcement truth**. Cloud is the **operating surface**.

## Local-first, cloud-paired

```text
┌─────────────────────────────┐      ┌─────────────────────────────┐
│   Local stack(s)             │      │   Faramesh Cloud             │
│                              │      │                              │
│   CLI, daemon, WAL, providers│◄────►│   Org auth, projects, fleet  │
│   Policy enforcement         │      │   Approvals UI, evidence,    │
│   Decision evidence (truth)  │      │   topology view, analytics   │
└─────────────────────────────┘      └─────────────────────────────┘
```

Every stack — laptop, CI runner, on-prem host, cloud VM — keeps its own WAL and runs its own daemon. Cloud is a control plane that pairs with those stacks; it never authorizes execution by itself.

Lose connectivity to Cloud and your enforcement keeps working. Cloud catches up via heartbeat once it's reachable again.

## What Cloud adds

### Projects

A **project** is a governed system boundary. One project per agent codebase / deployment.

The project overview shows:

- Connected runtimes and agents
- Attached policy version
- Recent permit / deny / defer counts
- Pending approvals and their queue age
- Top risky tools and actions
- Credential posture summary
- Latest incidents

### Approvals UI

The single biggest reason teams pay for Cloud. Operators get a real inbox with:

- Filtering by project, agent, risk, environment
- Decision context — the rule, the args (redacted), the principal
- One-click approve / reject / escalate
- Decision history per approver
- Webhook / Slack / PagerDuty integration for routing

`faramesh approvals` works locally for individual contributors. Cloud is what a security team uses to operate approvals across many projects.

### Decisions / Activity stream

A governance event stream across every project you operate. Filter by:

- Project, agent, framework
- Effect (permit / deny / defer / shadow)
- Tool / action
- Rule that fired
- Risk / cost / latency

Each decision links to its policy version, its approval (if any), and its evidence record. This is the surface that proves Faramesh is doing real work — not generic application logs.

### Policy lifecycle

Cloud doesn't replace `governance.fms` — your repo remains the source of truth. Cloud manages **attachment** and **rollout**:

- Inspect the attached policy for a project, see compiled rules.
- Validate and compare versions side by side.
- Promote a new version through environments (staging → production) with explicit gates.
- See **why** a rule produced an observed decision (decision-to-rule lookup).

Editing policy is a roadmap surface — Cloud first nails inspection, attachment, and diff.

### Evidence browser

Decision-centric, not log-centric. Open a decision and you see:

- The compiled rule it matched (with the source line and digest)
- The redacted arguments and the canonical hash
- The credential issued (provider, scope, TTL)
- The signature and chain link
- The approval (if any) and approver identity
- Links back to the audit sink for full-fidelity export

Built for **proof**, not for browsing every line of stdout.

### Credentials

Operational view of credential posture across the fleet:

- Configured brokers per project
- Backend health
- Stripped ambient credentials (and what was stripped)
- Scope expectations vs. observed issuance
- Rotation cadence and the last fresh credential per path

### Environments

Each stack reports its enforcement posture:

- OS / arch / hostname (no PII beyond what your stack already exposes)
- Mode (`enforce` / `audit`)
- Tier(s) active (SDK shim, MCP proxy, HTTP proxy, A2A)
- OS-tier capabilities (seccomp, Landlock, eBPF LSM)
- Identity source attached (SPIFFE id of the daemon)

A glance tells you which hosts are running the right posture for their environment.

### Usage analytics

Narrow, operational analytics:

- Permit / deny / defer volume per agent
- Approval load over time
- Top tools and actions
- Latency p50 / p95 / p99 per pipeline stage
- Cost per agent per day
- Policy hit frequency

No generic "AI insights" dashboards — every chart maps to an operator question.

### Incidents

When a security-relevant decision fires (`alert { on = "deny" ... }`) Cloud opens an incident. The incident shows the chain of decisions that led to it, links to the approving (or denying) operator, and remains open until acknowledged.

### Fleet management

For organizations running many stacks:

- Org → projects → agents hierarchy
- Per-org roles (operator, approver, auditor, admin)
- SSO via OIDC / SAML
- Org-wide policy packs and trust roots
- Per-environment defaults and overrides

## What Cloud explicitly is not

| It's not | What's wrong with that |
|----------|------------------------|
| A workflow builder | Agents are written in your framework. Cloud doesn't replace LangGraph / OpenAI Agents / etc. |
| An agent IDE | Your editor stays your editor. |
| A graph toy | The map is a **governance topology** view of real runtime objects, not a draw-it-yourself canvas. |
| A generic observability tool | Every surface maps to a Faramesh primitive (project, decision, approval, credential, evidence) — not arbitrary spans. |
| The enforcement engine | Cloud cannot authorize execution. The daemon remains the only thing that says permit / defer / deny. |

## Pairing a local stack

```bash
faramesh auth login          # OIDC flow with your org
faramesh project create production
faramesh apply --project production
```

After that, the daemon emits heartbeats and decision events to Cloud at the configured cadence. The control plane never reaches into the daemon — it can only **observe** and **request** (e.g. open an approval; the daemon decides whether the request applies based on policy).

To unpair:

```bash
faramesh project detach
```

The daemon keeps running. The WAL stays on disk. Nothing about local enforcement changes.

## Data residency

Cloud regions: US-East, US-West, EU-Central. Choose at org creation. Decisions and evidence stay in-region. Cross-region replication is opt-in per project.

For sovereignty-sensitive deployments, **Faramesh Cloud Self-Hosted** runs the same control plane in your VPC. Same product, same APIs, your hardware.

## Pricing model (overview)

- **Local runtime** — free and OSS forever. Includes WAL, providers, CLI, every interception tier.
- **Cloud** — per-seat for approvers/operators, plus an event-volume tier for high-throughput projects.
- **Self-hosted Cloud** — annual license, includes priority support and the policy-pack registry mirror.

## Roadmap

| Surface | State |
|---------|-------|
| Auth + orgs + projects | shipped |
| Approvals UI | shipped |
| Decision stream + filters | shipped |
| Evidence browser + export | shipped |
| Policy attach / compare | shipped |
| Credentials posture | beta |
| Topology map (governance) | beta |
| Policy editor in-app | roadmap |
| Incident workflows | roadmap |
| SAML / SCIM | roadmap |

## What's next

- [How Faramesh works](/concepts/how-it-works/) — the runtime model that Cloud sits on top of
- [Auditing](/concepts/auditing/) — the evidence stream Cloud indexes
- [Quickstart](/quickstart/) — get the runtime running first, pair to Cloud later
