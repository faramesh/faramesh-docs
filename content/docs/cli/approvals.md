---
title: faramesh approvals
description: List, inspect, approve, deny, and watch deferred tool calls. The CLI surface for human-in-the-loop governance.
---

`faramesh approvals` is the operator command set for resolving **deferred** tool calls. Actions that policy says require a human in the loop before they run. Every `defer` rule in your `governance.fms` produces approval records; this is how you (or a UI built on the same socket) handle them.

You'll use this all day if you're an operator. If you're an agent developer, you'll mostly call `list` and `approve` while iterating on policy.

## Usage

```bash title="Terminal"
faramesh approvals list      [--agent ID] [--status pending|approved|denied|expired] [--json]
faramesh approvals pending                                                       # alias for "list --status pending"
faramesh approvals show      <approval-id>
faramesh approvals approve   <approval-id> [--reason TEXT]
faramesh approvals deny      <approval-id> [--reason TEXT]
faramesh approvals watch     [--agent ID]
faramesh approvals history   [--agent ID] [--since DURATION]
```

All subcommands talk to the running daemon. The daemon must be in `READY` state (see [`faramesh status`](/cli/status/)).

## Subcommands

### `list` / `pending`

List approvals. Default is pending only:

```bash title="Terminal"
$ faramesh approvals list

Approval Queue
──────────────
NOTE: 2 pending approval(s)
APPROVAL ID  AGENT        TOOL           AGE   CONTEXT
apr-9001     support-bot  send_email     14m   to=customer@example.com
apr-9002     support-bot  stripe/refund  3m    amount=$8000
```

`--json` produces a stable schema for tooling:

```json title="Output"
{
  "approvals": [
    {
      "id": "apr-9001",
      "agent_id": "support-bot",
      "tool": "send_email",
      "args": { "to": "customer@example.com", "body": "[REDACTED]" },
      "deferred_at": "2026-05-17T19:30:00Z",
      "rule_ref": "governance.fms:14",
      "context": "exceeds session cap"
    }
  ]
}
```

Filtering:

```bash title="Terminal"
faramesh approvals list --agent support-bot
faramesh approvals list --status approved --since 24h
```

### `show`

Detailed view of one approval:

```bash title="Terminal"
$ faramesh approvals show apr-9001

Approval Detail
───────────────
Approval ID:  apr-9001
Status:       PENDING
Agent:        support-bot   (identity: spiffe://corp/support-bot)
Tool:         send_email
Rule ref:     governance.fms:14   (defer send_email if external)
Args:
  to:    customer@example.com
  body:  [REDACTED by redact send_email args:["body"]]
Deferred at:  2026-05-17T19:30:00Z
Pipeline state at decision time:
  - identity verified
  - rule#3 matched (defer)
  - rate limit ok (3/100 per hour)
  - budget ok ($82.50/$1000)
NEXT STEP: faramesh approvals approve apr-9001 --reason "...".
```

The arguments shown are post-redaction. Exactly what's stored in the WAL.

### `approve`

Resolve the approval as a permit:

```bash title="Terminal"
faramesh approvals approve apr-9001 --reason "manual review passed; customer in EU"
```

What happens:

1. The daemon updates the approval record (status `APPROVED`, with operator id and reason).
2. The next time the agent retries that exact same call, it permits **once**.
3. A signed DPR is written linking the operator who approved.
4. Any `alert { on = "approved" }` blocks fire.

The approval is single-use by default. The agent gets one permit; subsequent identical calls re-defer (assuming the rule still says `defer`).

### `deny`

Resolve as a deny:

```bash title="Terminal"
faramesh approvals deny apr-9002 --reason "amount exceeds policy ceiling"
```

The agent receives `POLICY_DENY` with your reason. Use this when the answer is a hard no rather than letting the approval expire.

### `watch`

Stream pending approvals live (TTY-friendly):

```bash title="Terminal"
faramesh approvals watch
[2026-05-17T19:30:00Z] apr-9001  support-bot  send_email     external recipient
[2026-05-17T19:33:14Z] apr-9002  support-bot  stripe/refund  amount=$8000
^C
```

Useful in a side terminal during policy authoring or in an on-call shift.

### `history`

Past approvals, including resolved and expired:

```bash title="Terminal"
$ faramesh approvals history --since 7d

Approval History (7d, 14 records)
ID        AGENT        TOOL          STATUS    DURATION  REASON
apr-8997  support-bot  send_email    APPROVED  3m        "verified internal"
apr-8998  support-bot  stripe/charge DENIED    1h        "fraud pattern"
apr-8999  support-bot  send_email    EXPIRED   24h       —
```

`EXPIRED` means the approval timed out without a decision. Default expiry is 24 hours; configurable via `runtime { approval_ttl = "12h" }`.

## Approvals in CI / scripts

Approvals are scriptable. The flow:

```bash title="Terminal"
# 1. List pending
PENDING_JSON="$(faramesh approvals list --json --status pending)"

# 2. Iterate and decide programmatically
echo "$PENDING_JSON" | jq -c '.approvals[]' | while read approval; do
  id=$(echo "$approval" | jq -r '.id')
  tool=$(echo "$approval" | jq -r '.tool')
  if [ "$tool" = "send_email" ]; then
    faramesh approvals approve "$id" --reason "auto-approved by script"
  fi
done
```

For programmatic use, build against the SDK socket directly and record every approval decision back into the daemon audit path.

## Approval lifecycle

```text title="Lifecycle"
PENDING ─► APPROVED  ─► (agent retries → permit, single use)
   │
   ├──────► DENIED    ─► (agent retries → POLICY_DENY)
   │
   └──────► EXPIRED   ─► (agent retries → POLICY_DEFER again, new approval)
```

## Common scenarios

### "I want to approve everything from one agent for the next hour"

That's a **standing grant**, not an approval. See [`faramesh credential` and standing grants](/concepts/credentials/#standing-grants). Approvals are per-call.

### "The approval expired before I saw it"

Raise `runtime { approval_ttl }` or wire alerts to a channel you watch. The `alert { on = "defer" notify = "slack://..." }` block does this.

### "I want a UI, not the CLI"

Build an internal UI or workflow integration on top of the same approval socket. The CLI remains the reference operator interface.

## What's next

- [Denial codes → POLICY_DEFER](/errors/#policy_defer): the SDK side.
- [Credentials → standing grants](/concepts/credentials/#standing-grants): bulk pre-authorization for trusted operators.
- [Auditing](/concepts/auditing/): how approval decisions are recorded.
- [`faramesh explain approval`](/cli/explain/): full evaluation context for one approval.
