---
title: What errors does Faramesh return?
---

Structured denials use this shape:

```json
{
  "code": "POLICY_DENY",
  "rule_ref": "governance.fms:12",
  "human_message": "denied: ...",
  "resolution": { "type": "pending_approval", "approval_id": "apr-9001" }
}
```

## RATE_EXCEEDED

```json
{
  "code": "RATE_EXCEEDED",
  "human_message": "denied: stripe/charge rate limit (10/minute) exceeded",
  "resolution": { "type": "retry_after", "retry_after_seconds": 43 }
}
```

## BUDGET_EXCEEDED

```json
{
  "code": "BUDGET_EXCEEDED",
  "human_message": "denied: daily budget ceiling ($10.00) reached",
  "resolution": { "type": "budget_reset", "resets_at": "2026-05-17T00:00:00Z" }
}
```

## BUDGET_WARNING

```json
{
  "code": "BUDGET_WARNING",
  "human_message": "budget 80% consumed ($400.00/$500.00 daily), approval required to continue",
  "resolution": { "type": "pending_approval", "approval_id": "apr-9001" }
}
```

## DAEMON_NOT_READY

```json
{
  "code": "DAEMON_NOT_READY",
  "human_message": "denied: daemon is initializing, retry in a moment",
  "resolution": { "type": "retry_after", "retry_after_seconds": 2 }
}
```

## COMPLETION_BLOCKED

```json
{
  "code": "COMPLETION_BLOCKED",
  "human_message": "agent cannot complete: 2 approvals pending",
  "resolution": { "type": "pending_approvals", "approval_ids": ["apr-8821", "apr-8822"] }
}
```

Next: [Limitations](/limitations/).
