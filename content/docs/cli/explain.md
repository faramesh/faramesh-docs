---
title: faramesh explain
description: Diagnostic command that traces a single decision, approval, or run through the policy pipeline and prints exactly why it landed where it did.
---

`faramesh explain` is the highest-signal debug command in Faramesh. Given a decision id, an approval id, an agent id, or a run/correlation id, it walks the full evaluation pipeline and prints **every step**: which rules were tried, which conditions evaluated true, which rate-limit and budget state applied, what credential was minted (or wasn't), and what redactions ran.

If you have a denial you don't understand, run this first.

## Usage

```bash title="Terminal"
faramesh explain decision   <dpr-id>
faramesh explain approval   <approval-id>
faramesh explain agent      <agent-id>
faramesh explain run        <correlation-id>
faramesh explain rule       <rule-ref>            # e.g. governance.fms:14
```

The daemon must be running and have access to the same WAL/SQLite store as the decision you're explaining. Run on the same host as the daemon, or against an exported audit bundle.

## Subcommands

### `explain decision`: why one DPR landed where it did

```bash title="Terminal"
$ faramesh explain decision dpr-7f3b

Decision dpr-7f3b
─────────────────
agent:    support-bot   (identity verified via SPIFFE: spiffe://corp/support-bot)
tool:     stripe/refund
args:
  amount: 8000
  card_number: [REDACTED]

Pipeline:
  1. Identity check     ✓ resolved (SPIFFE valid, fresh)
  2. Rule match         walking rules…
       rule#1  permit stripe/refund if amount < $500     → no match (8000 ≥ 500)
       rule#2  defer  stripe/refund if amount < $5000    → no match (8000 ≥ 5000)
       rule#3  deny   stripe/refund                      → match → DENY
  3. (pipeline stops at decision step)

Rate limits: stripe/* 2/10 per minute (ok)
Budgets:     daily $84.50 / $500 (16.9%, ok)
Egress:      n/a (SDK-tier)
Redaction:   args.card_number masked

Effect:      DENY
Reason:      refunds over $5000 require platform team
Rule ref:    governance.fms:18
DPR id:      dpr-7f3b
WAL link:    chain ok, signed by KMS key fingerprint 7b3e…
```

This output tells you, line by line:

- The agent's identity was attested.
- Three rules were evaluated; the first two didn't match because conditions were false.
- The third rule (a flat deny) matched.
- The pipeline stopped at the decision step (no credential brokered, no tool ran).
- Rate limits and budgets were not the cause.
- The denial was logged with full chain integrity.

### `explain approval`: why a defer is sitting there

```bash title="Terminal"
$ faramesh explain approval apr-9001

Approval apr-9001
──────────────────
status:    PENDING (14m)
agent:     support-bot
tool:      send_email
defer rule:  governance.fms:14   (defer send_email if external recipient)

Decision context at defer time:
  args.to:  customer@example.com
  matched:  args.to matches /@example\.com$/  → false (external)
  rate ok, budget ok

What happens on approve:
  agent retries the same call → daemon permits once → DPR signed with operator id

What happens on deny:
  agent retries → POLICY_DENY with reason "<your text>"

Suggested operator commands:
  faramesh approvals approve apr-9001 --reason "..."
  faramesh approvals deny    apr-9001 --reason "..."
```

This is what an on-call operator wants to see when triaging the queue.

### `explain agent`: current state of one agent

```bash title="Terminal"
$ faramesh explain agent support-bot

Agent support-bot
─────────────────
defined:    governance.fms:7-44
default:    deny
identity:   SPIFFE (verified)
session id: sess-abc

Counters (current session):
  decisions:  142  (137 permit, 4 defer, 1 deny)
  pending approvals: 1
  budget consumption: $84.50 / $500.00

Rules (in order):
  1. permit search_docs
  2. permit stripe/refund if amount < $500
  3. defer  stripe/refund if amount < $5000
  4. deny   stripe/refund
  5. deny   stripe/payouts

Rate limits:
  stripe/*    10/minute (current: 2)
  send_email  100/hour  (current: 13)
```

Useful when an agent suddenly behaves unexpectedly. You can see at a glance what it can and can't do.

### `explain run`: trace one logical action across many DPRs

When an agent task produces many tool calls, all sharing a `request_id` or `run_id`, `explain run` collects the entire lineage:

```bash title="Terminal"
$ faramesh explain run req-abc123

Run req-abc123 (5 decisions, 1.4s total)
────────────────────────────────────────
[+0.000s]  permit  search_docs       "shipping policy"
[+0.140s]  permit  ticket/read       id=42
[+0.412s]  defer   send_email        to=customer@external.com → apr-9001
[+0.840s]  permit  stripe/refund     amount=$80
[+1.430s]  permit  audit/write       reason="customer service refund"

Identity:   spiffe://corp/support-bot/abc
Total cost: $0.0418
Approvals:  1 pending (apr-9001)
```

The DPR ids in the timeline are clickable in tools that consume the JSON variant.

### `explain rule`: what one rule does and which decisions it has fired

```bash title="Terminal"
$ faramesh explain rule governance.fms:18

Rule governance.fms:18
──────────────────────
text:        deny stripe/refund reason "refunds over $5000 require platform team"
effect:      DENY
since:       applied 2026-05-15 (3 policy versions ago)
matches:
  last 24h:  11 decisions
  last 7d:   34 decisions

Sample DPRs:
  dpr-7f3b   amount=$8000   2026-05-17T19:30Z
  dpr-7e91   amount=$6500   2026-05-17T11:14Z
  …
```

Useful for sanity-checking a rule before tightening or removing it.

## JSON output

Every variant supports `--format json`:

```bash title="Terminal"
faramesh explain decision dpr-7f3b --format json
```

The schema is stable so CLIs, internal UIs, and audit tooling can consume the same decision-detail shape.

## When to use it

| Symptom | Command |
|---------|---------|
| "Why did this call deny?" | `explain decision <dpr-id>` (id from `audit tail`) |
| "Why is this approval pending? Should I approve?" | `explain approval <apr-id>` |
| "What can this agent currently do?" | `explain agent <agent-id>` |
| "What did the agent do during task X?" | `explain run <correlation-id>` |
| "Is this rule firing more or less than I think?" | `explain rule <file:line>` |

## What `explain` does NOT do

- It doesn't change state. Read-only.
- It doesn't replay a call against current policy (use `audit show` plus mental check, or `plan` for replay).
- It doesn't talk to providers. Pipeline state is read from the WAL/SQLite, not re-evaluated.

## What's next

- [Debugging denials](/guides/debugging-denials/): full diagnostic walkthrough.
- [`faramesh audit show`](/cli/audit/): the underlying DPR record.
- [Denial codes](/errors/): every code, payload, and recovery.
- [Enforcement](/concepts/enforcement/): the pipeline `explain` walks.
