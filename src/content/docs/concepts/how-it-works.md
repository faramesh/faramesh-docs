---
title: How Faramesh works
description: The mental model — where Faramesh sits, what it does on every tool call, and why it's deterministic.
---

Faramesh is a **runtime governance layer** for AI agents. It sits between the agent and the tools it can call, evaluates every action against a compiled policy, and writes a tamper-evident record of the decision.

There are three things to understand:

1. **Where Faramesh sits** — the placement
2. **What happens on every call** — the decision pipeline
3. **What guarantees the daemon provides** — the trust boundary

## Placement

```text
┌──────────────────────────────────────────────────────────┐
│                       Agent process                       │
│                                                          │
│   LLM   ─────────►   Tool router   ─────────►   ???      │
│                            │                              │
└────────────────────────────┼──────────────────────────────┘
                             │   every tool call
            ┌────────────────▼──────────────────┐
            │         Faramesh daemon            │
            │                                    │
            │   policy AST   provider broker     │
            │   WAL + DPR    completion gates    │
            │                                    │
            └────────────┬──────────┬────────────┘
                         │          │
              ┌──────────▼──┐   ┌───▼──────────┐
              │   Real      │   │  Vault, KMS,  │
              │   tool/MCP  │   │  audit sinks  │
              │   endpoint  │   │               │
              └─────────────┘   └───────────────┘
```

The agent only sees the **Faramesh shim** (SDK), or a **proxy URL** (MCP / HTTP). Every call is evaluated before the tool runs. The agent never reaches the real endpoint directly.

## The decision pipeline

When a call arrives, the daemon runs it through a deterministic pipeline:

```text
┌──────────────────────────────────────────────────────────┐
│  1.  Identity check          → who is the agent?          │
│  2.  Lookup matching rule    → first match wins           │
│  3.  Evaluate conditions     → if amount < $500 …         │
│  4.  Check rate limits       → 10/minute per pattern      │
│  5.  Check budgets           → daily ceiling intact?      │
│  6.  Check egress            → host in allow list?        │
│  7.  Apply redactions        → mask args before logging   │
│  8.  Decision: permit / defer / deny                      │
│  9.  Provider broker         → mint scoped credential     │
│  10. Run tool                → only if permit             │
│  11. Write DPR               → hash-chained, KMS-signed   │
│  12. Emit to audit sinks     → Splunk / Datadog / S3      │
└──────────────────────────────────────────────────────────┘
```

Steps 1–8 are pure functions over compiled policy and the action payload. No LLM is in the loop. No network call is required. The same input always produces the same decision.

If the decision is **defer**, the action is queued for a human and the pipeline stops at step 8 until an operator approves. If the decision is **deny**, the pipeline stops too — no tool runs, no credential is brokered.

## What's compiled, what's evaluated

`faramesh apply` runs the compiler:

```text
governance.fms   ──compile──►   .faramesh/policy.bin   ──load──►   daemon AST
   (source)                     (deterministic AST)              (in memory)
```

After `apply`, the daemon **does not re-read the source file**. Hot policy changes go through `faramesh apply` again, which atomically swaps the in-memory AST. This prevents an attacker from tampering with `governance.fms` and having the daemon silently pick up looser rules.

## What lives where

| Surface | Lives in | Role |
|---------|----------|------|
| `governance.fms` | Your repo | Source of truth, version-controlled. |
| `.faramesh/` | Stack directory | Compiled AST, WAL, state. |
| Daemon | Memory | Evaluates every call. |
| Providers | Subprocess | Mint secrets, sign DPRs, ship audit records. |
| SDK shim / proxy | Agent process or proxy port | Intercepts the call. |

## Why deterministic matters

The decision engine is intentionally **not** an LLM. Every reviewable property of the system — the rule that fired, the conditions that matched, the redactions applied, the credential that was minted — is reproducible from `(policy, action payload)` alone. That means:

- A denial is auditable. You can read the rule and the args.
- Policy changes can be tested. `faramesh plan` replays history against the new AST.
- The agent can't bargain with the engine. There's no prompt to escape.

## Where to go from here

- [Enforcement](/concepts/enforcement/) — the pipeline in depth
- [Interception](/concepts/interception/) — how Faramesh sits in front of the agent
- [Auditing](/concepts/auditing/) — DPR, WAL, hash chain, verification
- [Credentials](/concepts/credentials/) — provider broker and credential sequestration
- [Security model](/security/) — threats, guarantees, and limits
