---
title: How Faramesh works
description: The mental model in plain language. Where Faramesh sits, what happens on every tool call, what's compiled vs evaluated, and why it's deterministic.
---

If you remember nothing else, remember this: **Faramesh sits between the agent and its tools, and decides every tool call against a policy you wrote.**

Everything below is detail on top of that one sentence.

## The three things to understand

1. **Where Faramesh sits** — the placement.
2. **What happens on every call** — the decision pipeline.
3. **What guarantees the daemon provides** — the trust boundary.

We'll cover all three with examples.

## 1. Where Faramesh sits (placement)

Your agent runs in some process. It has tools. The framework you're using (LangGraph, Claude Code, Bedrock, whatever) decides which tool to call, with which arguments, and runs it. **Faramesh inserts itself between "decided to call" and "actually called."**

```text title="The placement"
┌──────────────────────────────────────────────────────────┐
│                       Agent process                      │
│                                                          │
│   LLM   ─────────►   Tool router   ─────────►   ???      │
│                            │                             │
└────────────────────────────┼─────────────────────────────┘
                             │   every tool call
            ┌────────────────▼──────────────────┐
            │         Faramesh daemon           │
            │                                   │
            │   policy AST   provider broker    │
            │   WAL + DPR    completion gates   │
            │                                   │
            └────────────┬──────────┬───────────┘
                         │          │
              ┌──────────▼──┐   ┌───▼──────────┐
              │   Real      │   │  Vault, KMS, │
              │   tool/MCP  │   │  audit sinks │
              │   endpoint  │   │              │
              └─────────────┘   └──────────────┘
```

The agent only sees one of two things, depending on how you wire it:

- **The Faramesh SDK shim** — a tiny library you import. Replaces your tool list with a wrapped version that calls the daemon first.
- **A proxy URL** — for MCP clients and HTTP-based runtimes, Faramesh runs a proxy port. You point the client at the proxy instead of the upstream.

Either way: the agent **never reaches the real endpoint directly** while the daemon is running. There is no opt-out path through the framework, because the framework itself has been redirected.

### Three tiers, one mental model

| Tier | Best for | Code change |
|------|----------|-------------|
| SDK shim | Native agents (LangGraph, LangChain, CrewAI, OpenAI Agents) | One import line |
| MCP proxy | Claude Code, Cursor, OpenCode, your own MCP client | None (config only) |
| HTTP proxy | Bedrock, hosted vendors, anything calling REST | None (config only) |

You can mix tiers. A LangGraph agent that also talks to a hosted MCP server can use both the SDK shim **and** the MCP proxy — same daemon, same policy, two interception points.

→ Full detail on [Interception](/concepts/interception/).

## 2. What happens on every call (the pipeline)

A tool call arrives at the daemon. Here's what runs, in order. Each step can deny, defer, or pass.

```text title="The decision pipeline"
┌──────────────────────────────────────────────────────────┐
│  1.  Identity check          → who is the agent?         │
│  2.  Lookup matching rule    → first match wins          │
│  3.  Evaluate conditions     → if amount < $500 …        │
│  4.  Check rate limits       → 10/minute per pattern     │
│  5.  Check budgets           → daily ceiling intact?     │
│  6.  Check egress            → host in allow list?       │
│  7.  Apply redactions        → mask args before logging  │
│  8.  Decision: permit / defer / deny                     │
│  9.  Provider broker         → mint scoped credential    │
│  10. Run tool                → only if permit            │
│  11. Write DPR               → hash-chained, KMS-signed  │
│  12. Emit to audit sinks     → Splunk / Datadog / S3     │
└──────────────────────────────────────────────────────────┘
```

A few important properties of this pipeline:

- **Steps 1–8 are pure functions.** They take `(policy AST, action payload)` and return a decision. No LLM, no network call, no file read.
- **Same input → same decision, every time.** That's what "deterministic" means here. You can replay any decision offline and prove the daemon would make the same one.
- **Defer stops the pipeline at step 8.** The action is queued for a human; the credential is **not** brokered, the tool is **not** run.
- **Deny stops the pipeline at step 8.** Same — nothing else happens.

### Worked example

You wrote this policy:

```hcl title="governance.fms"
agent "support-bot" {
  default deny

  rules {
    permit search_docs
    permit stripe/refund if amount < $500
    defer  stripe/refund if amount >= $500
    deny   stripe/payouts reason "platform team only"
  }

  rate_limit "stripe/*": 10 per minute

  budget daily {
    max       $500
    on_exceed defer
  }

  redact stripe/refund args: ["card_number"]

  egress {
    allow = ["api.stripe.com", "docs.example.com"]
  }
}
```

Three calls come in:

| Call | What happens | Why |
|------|--------------|-----|
| `search_docs({"q": "shipping"})` | **Permit.** Tool runs. DPR written. | Step 2 matches `permit search_docs`. No conditions. Steps 3–8 pass. |
| `stripe/refund({"amount": 80, "card_number": "4242…"})` | **Permit.** Stripe key minted, refund runs. DPR written with `card_number` redacted. | Step 2 matches `permit stripe/refund if amount < $500`. Step 3 evaluates `80 < 500` → true. Step 7 redacts `card_number`. |
| `stripe/refund({"amount": 8000})` | **Defer.** Approval queued. Refund does not run. | Step 2 matches `defer stripe/refund if amount >= $500`. Pipeline stops at step 8. Operator must approve. |

The same three calls, the same policy, every time. That's the entire model.

## 3. What guarantees the daemon provides (trust boundary)

The daemon is the only thing trusted to enforce policy on this host. Concretely, the daemon guarantees:

- **No tool call bypasses the pipeline.** As long as the agent goes through the SDK shim or proxy (and you've enabled OS-tier on Linux/macOS for hostile-agent setups), there's no path to the real endpoint that skips the daemon.
- **Policy can't be silently swapped.** `faramesh apply` is the only way to update the in-memory AST. The daemon does not re-read `governance.fms` between applies.
- **Records can't be silently rewritten.** The WAL is append-only and hash-chained. With KMS signing enabled, even compromising the host doesn't let you forge plausible audit history.
- **The agent doesn't hold long-lived secrets.** Credentials are brokered at the call site (step 9) and have lifetimes you set (typically 30s–5min). They go to the SDK shim or proxy, not to the agent's environment.

What the daemon does **not** guarantee:

- It doesn't stop a malicious tool from doing something out-of-band that doesn't touch its declared API. (Mitigation: OS-tier sandbox on Linux/macOS — see [Architecture](/concepts/architecture/#5-the-agent-supervisor-and-os-tier-sandbox).)
- It doesn't make a wrong policy correct. If your `governance.fms` says `permit *`, that's what it'll do.
- It doesn't replace network segmentation, IAM, or the rest of your security stack. It augments them at the agent decision layer.

## What's compiled, what's evaluated

People get this confused, so let's draw it out:

```text title="The two phases"
┌─ Build/deploy time ────────────────────┐  ┌─ Runtime ──────────────────────┐
│                                        │  │                                │
│   governance.fms                       │  │   call arrives                 │
│        │                               │  │        │                       │
│        ▼                               │  │        ▼                       │
│   faramesh check    ← types, schema    │  │   policy AST (in memory)       │
│        │                               │  │        │                       │
│        ▼                               │  │        ▼                       │
│   faramesh plan     ← decision diff    │  │   pipeline (steps 1–12)        │
│        │                               │  │        │                       │
│        ▼                               │  │        ▼                       │
│   faramesh apply    ← compile & swap   │  │   permit / defer / deny        │
│        │                               │  │        │                       │
│        └──── policy AST ──────────────────────►    │                       │
│                                        │  │                                │
└────────────────────────────────────────┘  └────────────────────────────────┘
```

`faramesh apply` is the **only** path from source to running daemon. After apply, the daemon does not re-read the file, does not watch the disk, does not poll a registry. The in-memory AST is what's enforced. To change policy, you `faramesh apply` again — which atomically swaps the AST.

This is deliberate. If the daemon hot-reloaded `governance.fms` automatically, an attacker who got file write would also get policy authority.

## Stacks, agents, deployments

These three words get confused too:

- **Stack** = one `governance.fms` + one logical daemon + one audit chain. The unit of governance.
- **Agent** = a row inside `governance.fms` (`agent "support-bot" { … }`). One stack can declare many agents.
- **Deployment** = how many machines run the daemon. Ten replicas of the same policy is **one stack with ten instances**, not ten stacks.

A stack splits into two stacks only when the **governance context** truly differs: different secrets, different identity providers, different rules, different retention. Environments and teams are real boundaries. Replicas are not.

→ Full enumeration with diagrams: [Topologies](/concepts/topologies/).

## Why deterministic matters

The decision engine is intentionally **not** an LLM. Every reviewable property — the rule that fired, the conditions that matched, the redactions applied, the credential that was minted — is reproducible from `(policy, action payload)` alone. That means:

- A denial is auditable. You can read the exact rule and the exact args.
- Policy changes can be tested. `faramesh plan` replays history against the new AST and tells you what would have changed.
- The agent can't bargain with the engine. There's no prompt to escape.
- Compliance evidence is real evidence. Auditors can replay decisions offline.

If we let an LLM make policy decisions, none of those properties would hold.

## Where to go from here

- [Architecture](/concepts/architecture/) — the daemon, the supervisor, the OS sandbox, end to end.
- [Enforcement](/concepts/enforcement/) — the pipeline in depth, with latency numbers.
- [Interception](/concepts/interception/) — how the call reaches the daemon.
- [Identity](/concepts/identity/) — workload identity for agents.
- [Topologies](/concepts/topologies/) — every realistic deployment shape.
- [Auditing](/concepts/auditing/) — DPR, WAL, hash chain, verification.
- [Security model](/security/) — threats, guarantees, and explicit limits.
