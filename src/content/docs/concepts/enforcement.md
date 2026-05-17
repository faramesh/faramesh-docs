---
title: Enforcement
description: How Faramesh evaluates every tool call before it runs, what's deterministic, and how policy reaches the daemon.
---

**Enforcement** is the act of turning your `governance.fms` into a binding decision on every tool call. This page describes the pipeline in detail — what runs, in what order, and what guarantees each step provides.

## Modes

Two enforcement modes, set in `runtime { mode = ... }`:

| Mode | Behavior | When to use |
|------|----------|-------------|
| `enforce` | Denials block the call. Defers queue for human approval. Permits run. | Production. The default. |
| `audit` | Every call runs. Decisions are recorded as if the daemon had blocked them. | Rolling out a new rule. Letting a team see what would change before flipping the switch. |

`faramesh status` always shows the current mode. `faramesh apply` validates that production-critical providers (KMS, audit sink) are reachable before promoting from `audit` to `enforce`.

## The pipeline

A single tool call traverses ten stages. Each stage can deny, defer, or pass.

### 1. Identity attestation

The daemon resolves the agent identity for this call:

- If a SPIFFE provider is declared, the daemon fetches an SVID via the workload API and verifies the agent process matches the expected selectors.
- Otherwise, the identity is derived from the local socket peer or the SDK shim's declared `agent_id`.

The identity becomes the key for budget and rate-limit lookups for the rest of the pipeline. **A mismatch fails closed** — no rule will match if the identity doesn't resolve.

### 2. Rule match

```fpl
rules {
  permit stripe/charge if amount < $500
  defer  stripe/refund
  deny   stripe/payouts
}
```

The pipeline walks rules **top to bottom**. The first rule whose `tool` pattern matches the action wins. Globs (`stripe/*`) match as expected. If nothing matches, the agent's `default` effect applies (`deny` by convention).

### 3. Condition evaluation

For the matched rule, the `if` clause is evaluated against the action payload. Conditions are pure boolean expressions over the same set of typed variables (`args.<field>`, `host`, `method`, `path`, `principal`, `time`). See the [FPL reference](/fpl/#conditions).

Two important properties:

- **No side effects.** Conditions can't call functions, read files, or talk to the network. They are pure.
- **Total.** A condition either evaluates to true, false, or "field missing" (which is treated as false). It never throws.

### 4. Rate limit

The daemon maintains a token bucket per `rate_limit` pattern per agent. If the bucket is empty, the call denies with `RATE_EXCEEDED` and a `retry_after_seconds` hint.

Rate limits live in the daemon's process memory and survive WAL replay on restart. Buckets refill at the configured `per <window>` rate.

### 5. Budget

Every `permit` consumes from the agent's budgets. The cost is provided by the **cost provider** (defaults to a bundled token-pricing table for the major model APIs and a flat per-call cost for non-LLM tools).

- If consumption + this call would exceed `max`, the rule's `on_exceed` applies (`deny`, `defer`, or `audit`).
- If consumption ≥ `warn_at * max`, a `BUDGET_WARNING` is emitted but the call proceeds (or defers, depending on `on_exceed`).

### 6. Egress

If the call is being governed through the HTTP proxy tier (or the SDK shim makes an outbound request), the destination host is matched against `egress.allow` and `egress.deny`. A denied host produces `EGRESS_DENIED`.

### 7. Redaction

Before the daemon writes anything to the WAL, fields named in `redact <tool> args: [...]` are masked. The redacted value is what subsequently flows to providers and audit sinks. Original arguments are never persisted.

### 8. Decision emit

The daemon now has its decision: `permit`, `defer`, or `deny`. It builds a structured payload (see [Denial codes](/errors/)) and returns it to the caller. If the decision is **defer**, the action is also written to the approvals queue.

### 9. Credential broker

For a `permit` decision, the daemon **then** asks the relevant provider for any scoped credential the tool will need (Vault token, AWS STS session, etc.). The credential never enters the agent process — it's injected at the call site by the SDK shim or proxy.

### 10. Tool execution and DPR

The tool runs. Faramesh records a **Decision Provenance Record** (DPR) — the inputs (redacted), the rule that fired, the credential issuance metadata, the latency, and the result code — into the WAL. The WAL is hash-chained, optionally signed by KMS. See [Auditing](/concepts/auditing/).

## Latency budget

Steps 1–8 typically complete in **0.4–1.2 ms** on a warm cache. Step 9 (provider call) is the slow path:

| Provider | Typical latency |
|----------|-----------------|
| Built-in stub (no-infra mode) | < 0.1 ms |
| Local Vault | 1–3 ms |
| Hosted Vault | 5–15 ms |
| AWS Secrets Manager | 10–25 ms |
| KMS sign for DPR | 4–12 ms (out of the hot path; signed asynchronously by default) |

DPR signing happens out of band with batching — the call returns to the agent on `permit` immediately after step 9.

## Failure modes

| Failure | Behavior |
|---------|----------|
| Daemon initializing | Denies with `DAEMON_NOT_READY` and a 2-second retry hint. |
| Provider unreachable | Denies with `CREDENTIAL_UNAVAILABLE`. The action is **not** denied by policy; it's blocked because Faramesh refuses to fulfill the credential request unsafely. |
| WAL write fails | Daemon enters degraded mode. New calls deny with a structured error until the WAL recovers. |
| Compile error at hot-swap | The old AST stays loaded. The new policy is rejected. `faramesh apply` returns non-zero. |

**Faramesh fails closed.** Every error path denies; nothing slips through because the daemon got confused.

## What the policy can't do

To keep the engine deterministic, FPL conditions deliberately **cannot**:

- Call external services (no HTTP from policy).
- Read files or environment variables at evaluation time (env-resolution happens at compile, not at decision time).
- Invoke language models.
- Reach into the WAL.
- Modify rates, budgets, or other state.

If you need a dynamic decision based on something not in the action payload, expose it through a **selector** (a typed, cached external lookup with strict timeout and a fallback effect):

```fpl
selector "user_role" {
  source        = "https://idp.internal/role"
  cache         = "5m"
  on_unavailable = "deny"
  on_timeout     = "deny"
}

rules {
  permit stripe/charge if user_role == "ops" and amount < $5000
}
```

Selectors keep the pipeline deterministic at decision time (the cache is what's read), with an explicit fallback if the cache misses or the source is down.

## Hot-swapping policy

`faramesh apply` performs an **atomic AST swap**:

1. Parse and compile the new `governance.fms`.
2. Validate that every referenced provider and identity resolves.
3. Run `faramesh plan` against the last 24h of decisions and report the diff.
4. If validation passes, swap the in-memory AST in a single pointer write.
5. Persist the new policy version into the WAL with a hash so `faramesh audit verify` continues unbroken.

In-flight calls that have already passed step 3 finish under the **old** AST. New calls see the new AST. There is no window where some rules are old and some are new for the same call.

## What's next

- [Interception](/concepts/interception/) — how the call reaches the daemon in the first place
- [Auditing](/concepts/auditing/) — what gets recorded and how to verify it
- [Credentials](/concepts/credentials/) — the broker and credential sequestration
- [FPL reference](/fpl/) — every condition and effect
