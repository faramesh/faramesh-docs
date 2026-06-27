---
title: Topologies
description: Every realistic deployment shape for Faramesh, what counts as one stack, when you need many, and how identity ties the picture together.
---

A **stack** is the unit of governance in Faramesh: one `governance.fms`, one logical daemon, one audit chain. Most confusion about Faramesh comes from misjudging what is one stack versus many.

This page is the answer in concrete shapes. Ten situations, from a single laptop to multi-region multi-cloud, with the same question answered each time: **how many stacks?**

## The rule

> One `governance.fms` is one stack, regardless of how many agents it declares, how many sub-agents they spawn, or how many machines run the daemon.

A stack scales horizontally as instances. A stack splits into many only when the **governance context** truly differs, different secrets, different identity providers, different rules, different retention. Environments and teams are real boundaries. Replicas of the same agent are not.

Identity is what holds it together across all of these shapes. Every per-agent rule, budget, and credential is keyed off the agent's attested identity ([SPIFFE / SVID / OIDC](/concepts/identity/)), the daemon never trusts the agent's self-declared id.

## Situation 1. One developer, one agent, one machine

A developer runs a LangGraph agent on their laptop. One `governance.fms`. One daemon running locally. The daemon governs that one agent via the SDK shim.

```text title="Output"
[laptop]
  faramesh daemon (one stack)
  └── governs: LangGraph agent process
```

**Stacks: 1.** This is the [quickstart](/quickstart/) shape. Everything else is a generalization.

## Situation 2. One machine, multiple agents

A company runs three different agents on one server: a customer-support agent, a data-pipeline agent, and a document-processing agent. One `governance.fms` that declares all three. One daemon. The daemon governs all three via their respective SDK shims.

```text title="Output"
[server]
  faramesh daemon (one stack)
  ├── governs: customer-support-agent process
  ├── governs: data-pipeline-agent process
  └── governs: document-processing-agent process
```

**Stacks: 1.** This is the most important case to internalize. Multiple agents on one machine is **one** stack, not three.

```hcl title="governance.fms"
agent "customer-support-agent" {
  budget { id = "daily" usd = 5 }
  rules {
    permit zendesk/tickets/read
    permit email/send if email.to in ["@corp.example"]
  }
}

agent "data-pipeline-agent" {
  budget { id = "daily" usd = 50 }
  rules {
    permit warehouse/query/read
    deny   warehouse/*/write
  }
}

agent "document-processing-agent" {
  budget { id = "daily" usd = 20 }
  rules {
    permit s3/objects/read
    permit s3/objects/write if s3.bucket == "outputs"
  }
}
```

Each agent has its own SPIFFE id. The daemon evaluates every call against the matching `agent { ... }` block, distinct rules, distinct budgets, distinct rate buckets, **one** stack.

## Situation 3. One agent that spawns sub-agents dynamically

A supervisor agent creates worker agents at runtime. The supervisor and all its workers are declared in one `governance.fms`. One daemon governs every call from every agent, the supervisor's calls and every worker's calls.

```text title="Output"
[server]
  faramesh daemon (one stack)
  └── governs: supervisor-agent process
        ├── spawns: worker-agent-1 (governed by same daemon)
        ├── spawns: worker-agent-2 (governed by same daemon)
        └── spawns: worker-agent-3 (governed by same daemon)
```

**Stacks: 1.** Sub-agents are not separate stacks. They are agents declared in the same `governance.fms` with their own `agent { ... }` blocks.

```hcl title="governance.fms"
agent "supervisor" {
  spawn {
    allow = ["worker-research", "worker-writer", "worker-reviewer"]
    max_concurrent = 8
  }
  delegate {
    to       = ["worker-research", "worker-writer", "worker-reviewer"]
    inherits = ["budget.daily"]
  }
}

agent "worker-research" {
  rules {
    permit web/fetch
    deny   filesystem/write
  }
}

agent "worker-writer" {
  rules {
    permit filesystem/write if path.starts_with("./drafts/")
  }
}
```

The supervisor's identity is attested at startup. Each worker the supervisor spawns is attested independently, the daemon refuses to evaluate calls from a worker without a fresh SVID issued for that worker process. Delegation chains are recorded in every DPR so audit pipelines see the full identity path that produced the action.

## Situation 4. One agent deployed across multiple machines for scale

A payment agent runs on ten machines behind a load balancer for horizontal scaling. Each machine runs its own Faramesh daemon. Each daemon has the same `governance.fms` applied to it. **Ten daemons, one stack**, they are running the same configuration.

```text title="Output"
[load balancer]
  ├── [machine 1]: faramesh daemon + payment-agent
  ├── [machine 2]: faramesh daemon + payment-agent
  ├── [machine 3]: faramesh daemon + payment-agent
  └── ... (ten machines total)
```

**Stacks: 1 (with 10 instances).** Each daemon has its own WAL. Each daemon governs the agent process on its machine. The **stack identity** is what they share, a stack id provisioned by `faramesh apply` and embedded in the compiled state.

External observability or audit systems can aggregate DPR streams across all ten daemons. Each daemon still writes its local WAL before the action completes.

When budgets need to be enforced across the fleet (one global $1,000/day ceiling for the agent, not ten independent $1,000/day ceilings), declare a **shared budget backend**:

```hcl title="governance.fms"
runtime {
  budget_backend = "redis://budgets.internal:6379"
}

agent "payment-agent" {
  budget { id = "global-daily" usd = 1000 scope = "fleet" }
}
```

Without a shared backend, every daemon enforces budgets locally, which is correct for some patterns (per-machine quotas) and wrong for others (single org-wide ceiling).

## Situation 5. Multiple environments for one product

A company has dev, staging, and production environments for their payment agent system. Each environment is a separate stack, different secrets, different identity, different enforcement depth.

```text title="Output"
[dev machines]     → dev stack     → dev daemon     → dev WAL
[staging machines] → staging stack → staging daemon → staging WAL
[prod machines]    → prod stack    → prod daemon    → prod WAL
```

**Stacks: 3.** Three completely separate governance contexts.

| | Dev | Staging | Prod |
|---|-----|---------|------|
| Mode | `audit` | `enforce` | `enforce` |
| Identity | local SPIRE | OIDC via Okta | OIDC via Okta + SPIRE federation |
| Secrets backend | local fixture | Vault dev | Vault prod |
| KMS signing | local key | local key | AWS KMS |
| OS-tier enforcement | off | optional | required (Linux) |
| WAL retention | 7 days | 30 days | 18 months + S3 archive |

An external evidence workflow can cover prod only, or all three environments, depending on what the auditor asks for.

## Situation 6. Multiple teams, multiple products

A company has a payments team and a logistics team. Each builds and operates its own agent systems. Each team owns its own `governance.fms`. Each has its own daemon.

```text title="Output"
[payments team infra]
  faramesh daemon (payments stack)
  ├── governs: refund-agent
  ├── governs: fraud-check-agent
  └── governs: charge-agent

[logistics team infra]
  faramesh daemon (logistics stack)
  ├── governs: routing-agent
  └── governs: inventory-agent
```

**Stacks: 2.** The platform shows both to whoever has organization-level access. Each team only sees their own stack in day-to-day operations.

This is the most common shape inside larger companies: each product team owns its stack. The platform's role-based access controls scope visibility and approval authority per stack.

## Situation 7. Kubernetes deployment

One agent system deployed as a Kubernetes cluster. The Faramesh daemon runs as a sidecar container in each pod. All pods share the same `governance.fms` applied via a ConfigMap. All daemons connect to the same DPR persistence backend (Postgres).

```text title="Output"
[kubernetes cluster]
  pod 1: [agent container] + [faramesh daemon container]
  pod 2: [agent container] + [faramesh daemon container]
  pod 3: [agent container] + [faramesh daemon container]

  all daemons share: same governance.fms, same Postgres WAL backend
```

**Stacks: 1.** The unit of governance is the agent system, not the pod. Pods are replicas.

```yaml title="config.yaml"
# k8s manifest sketch
apiVersion: v1
kind: ConfigMap
metadata:
  name: faramesh-governance
data:
  governance.fms: |
    runtime {
      mode             = "enforce"
      wal_backend      = "postgres://wal.internal/faramesh?sslmode=verify-full"
      stack_id         = env("FARAMESH_STACK_ID")
    }
    # ...

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments-agent
spec:
  replicas: 6
  template:
    spec:
      serviceAccountName: payments-agent
      containers:
        - name: agent
          image: corp/payments-agent:1.4.2
          env:
            - { name: FARAMESH_SOCKET, value: "/run/faramesh/agent.sock" }
        - name: faramesh
          image: ghcr.io/faramesh/daemon:0.9.0
          volumeMounts:
            - { name: governance, mountPath: /etc/faramesh }
            - { name: faramesh-socket, mountPath: /run/faramesh }
      volumes:
        - { name: governance, configMap: { name: faramesh-governance } }
        - { name: faramesh-socket, emptyDir: {} }
```

Workload identity is the projected service account token (`type = "k8s-projected"` in the [identity provider](/concepts/identity/)). The Postgres-backed WAL gives you fleet-wide chain integrity and queryable retention. SPIRE-on-Kubernetes is the recommended setup for high-assurance clusters.

## Situation 8. Serverless agent

A Lambda function runs an agent. Serverless, ephemeral, no persistent local daemon. This is the **remote** transport mode. The Lambda function calls the Faramesh governance API over HTTPS before each tool call. The Faramesh daemon runs as a separate persistent service.

```text title="Output"
[Faramesh service] (one stack, persistent)
  ↑ HTTPS governance calls
  ├── Lambda invocation 1 (agent)
  ├── Lambda invocation 2 (agent)
  └── Lambda invocation 3 (agent)
```

**Stacks: 1.** The persistent Faramesh service is the stack. The Lambdas are ephemeral instances of the agent process.

```ts title="index.ts"
// Lambda handler
import { governedTools, HttpTransport } from "@faramesh/sdk";

const tools = governedTools(toolSet, {
  agentId: "payments-bot",
  transport: new HttpTransport(process.env.FARAMESH_REMOTE_URL!, {
    token: process.env.FARAMESH_TOKEN,
  }),
});

export const handler = async (event) => {
  return runAgent(event, tools);
};
```

Each Lambda invocation attests its identity via AWS-native workload identity (`type = "aws-workload"`), the IAM role of the function is the SPIFFE-equivalent claim the daemon verifies. No long-lived secrets in the Lambda. Same pattern works for Cloudflare Workers, Vercel functions, and Cloud Run.

The remote daemon can be a single service, or itself horizontally scaled (situation 4 applied to the daemon tier).

## Situation 9. Claude Code for an entire engineering team

Twenty engineers each running Claude Code on their laptops. Each laptop is a separate machine. Do you run twenty stacks?

**No, usually one.** The unit of governance is the policy contract for the team's use of Claude Code, not each machine. One `governance.fms` is applied to each laptop. Twenty daemon instances, one stack definition.

```hcl title="governance.fms"
agent "engineer-alice"   { budget { id = "daily" usd = 10 } }
agent "engineer-bob"     { budget { id = "daily" usd = 10 } }
agent "contractor-xyz"   {
  budget { id = "daily" usd = 2 }
  enforcement { os_tier = true filesystem = "tight" }
}
```

Each engineer's laptop attests its identity (SPIFFE workload id derived from the OS user + a corp-issued OIDC JWT). The daemon evaluates each tool call against the matching `agent { ... }` block. Different engineers, different ceilings, **same** stack.

If a specific contractor needs an entirely different governance posture (different identity provider, different audit retention, different egress policy), that's a separate stack. Otherwise, one stack with twenty agent declarations is the right shape.

## Situation 10. Multi-cloud, multi-region production

One agent system deployed across AWS `us-east-1` and GCP `europe-west1` for latency and redundancy. Two regions, two clouds, but one governance context.

```hcl title="governance.fms"
provider "aws-sm-us" {
  type   = "aws-sm"
  region = "us-east-1"
}

provider "gcp-sm-eu" {
  type    = "gcp-sm"
  project = env("GCP_PROJECT_EU")
}

agent "payment-agent" {
  credential "stripe" {
    backend = env("REGION_PROVIDER")   # resolves to aws-sm-us or gcp-sm-eu
    path    = "prod/stripe"
    ttl     = "30m"
  }
}
```

**Stacks: 1.** One `governance.fms`. Each region runs its own daemon instances. Each region resolves to the provider local to that region via `env(...)`. Same audit chain. DPRs from both regions stream to the same WAL backend.

Fleet-level observability should show the regional split, including per-region credential issuance latencies and per-region budget burn.

## Cheat sheet

| Shape | Stacks |
|-------|-------:|
| Laptop, one agent | 1 |
| Server, multiple agents | 1 |
| Supervisor + spawned workers | 1 |
| Horizontal scale (10 machines, same agent) | 1 (with 10 instances) |
| Dev / staging / prod | 3 |
| Two product teams | 2 |
| Kubernetes cluster, sidecar daemon | 1 |
| Serverless agents + remote daemon | 1 |
| Engineering team, Claude Code | 1 (with N agents) |
| Multi-cloud, multi-region production | 1 |

## What is the same across all of these

Three properties hold in every situation above. They are the things Faramesh guarantees regardless of topology.

- **Identity is attested.** Every governed call carries a verified SPIFFE / OIDC identity claim. The agent never declares its own identity to the daemon.
- **The decision is local.** The daemon that evaluates a call is the same daemon that fsync's the DPR before returning `permit`. There is no in-the-loop network hop to a control plane.
- **The chain is verifiable.** Every DPR is hash-linked to the previous one and signed (locally for dev, by [external KMS](/concepts/kms/) for production). `faramesh audit verify` works on any single instance's WAL or on a multi-instance archive.

If a deployment shape would break any of those three, it's the wrong shape.

## What's next

- [Identity](/concepts/identity/): what attests every agent in every shape above
- [Enforcement](/concepts/enforcement/): the decision pipeline
- [Auditing](/concepts/auditing/): what flows out of every daemon
- [Auditing](/concepts/auditing/): the evidence stream that ties multi-instance and multi-stack deployments together
- [Stack file](/stack/): declaring agents, providers, and identity in `governance.fms`
