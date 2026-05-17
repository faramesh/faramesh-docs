---
title: Denial codes
description: Every structured error Faramesh returns to an agent, with payloads and resolution hints.
---

When the daemon denies, defers, or short-circuits a tool call, it returns a structured payload, never a free-form string. SDKs raise it as `ToolDeniedException`; HTTP and MCP proxy responses include it in the error envelope.

```json title="response.json"
{
  "code": "POLICY_DENY",
  "rule_ref": "governance.fms:12",
  "human_message": "denied: stripe/payouts is not in the allow list",
  "resolution": {
    "type": "rule_block",
    "rule_id": "governance.fms:12"
  }
}
```

Every payload has `code`, `human_message`, and a `resolution` hint describing what the agent (or SDK) should do next.

## POLICY_DENY

The matched rule said `deny`.

```json title="response.json"
{
  "code": "POLICY_DENY",
  "rule_ref": "governance.fms:12",
  "human_message": "denied: stripe/payouts blocked by policy",
  "resolution": { "type": "rule_block", "rule_id": "governance.fms:12" }
}
```

Resolution: the agent shouldn't retry. The rule is intentional. An operator can edit `governance.fms` if the rule is wrong.

## POLICY_DEFER

The matched rule said `defer`. The action waits for human approval.

```json title="response.json"
{
  "code": "POLICY_DEFER",
  "rule_ref": "governance.fms:14",
  "human_message": "stripe/refund deferred for operator approval",
  "resolution": { "type": "pending_approval", "approval_id": "apr-9001" }
}
```

Resolution: the agent should surface the approval id, optionally poll `/v1/approvals/<id>`, and retry once the operator approves.

## RATE_EXCEEDED

The tool pattern's rate limit was hit.

```json title="response.json"
{
  "code": "RATE_EXCEEDED",
  "human_message": "denied: stripe/charge rate limit (10/minute) exceeded",
  "resolution": { "type": "retry_after", "retry_after_seconds": 43 }
}
```

Resolution: wait `retry_after_seconds` and retry. SDKs apply a backoff automatically when `retry_after` is set.

## BUDGET_EXCEEDED

A budget ceiling has been reached.

```json title="response.json"
{
  "code": "BUDGET_EXCEEDED",
  "budget_id": "daily",
  "human_message": "denied: daily budget ceiling ($500.00) reached",
  "resolution": { "type": "budget_reset", "resets_at": "2026-05-18T00:00:00Z" }
}
```

Resolution: the agent should stop, surface the reset time, and resume after `resets_at`.

## BUDGET_WARNING

The agent is approaching a budget threshold. Soft signal, the action still runs.

```json title="response.json"
{
  "code": "BUDGET_WARNING",
  "budget_id": "daily",
  "human_message": "budget 80% consumed ($400.00/$500.00 daily)",
  "resolution": { "type": "pending_approval", "approval_id": "apr-9001" }
}
```

When `warn_at` triggers, the rule's `on_exceed` policy decides whether the call still proceeds. With `on_exceed = defer`, an approval id is included.

## DAEMON_NOT_READY

The daemon is still initializing, replaying the WAL, launching providers, or verifying the DPR chain.

```json title="response.json"
{
  "code": "DAEMON_NOT_READY",
  "human_message": "denied: daemon is initializing, retry in a moment",
  "resolution": { "type": "retry_after", "retry_after_seconds": 2 }
}
```

Resolution: wait and retry. Usually clears in under five seconds; configurable via `runtime { cold_start_grace = "..." }`.

## COMPLETION_BLOCKED

The agent tried to mark a task complete while gates failed.

```json title="response.json"
{
  "code": "COMPLETION_BLOCKED",
  "human_message": "agent cannot complete: 2 approvals pending",
  "resolution": {
    "type": "pending_approvals",
    "approval_ids": ["apr-8821", "apr-8822"]
  }
}
```

Resolution: resolve the listed approvals, then retry completion.

## EGRESS_DENIED

The tool tried to reach a host not in the `egress.allow` list.

```json title="response.json"
{
  "code": "EGRESS_DENIED",
  "human_message": "denied: host 'evil.example.com' not in egress allow list",
  "resolution": { "type": "rule_block", "rule_id": "egress" }
}
```

## MODEL_DENIED

The agent invoked a model not in `model_policy.allow`.

```json title="response.json"
{
  "code": "MODEL_DENIED",
  "human_message": "denied: model 'gpt-3.5-turbo' is not permitted",
  "resolution": { "type": "rule_block", "rule_id": "model_policy" }
}
```

## CREDENTIAL_UNAVAILABLE

The provider call failed (Vault down, IAM role expired, network).

```json title="response.json"
{
  "code": "CREDENTIAL_UNAVAILABLE",
  "provider": "vault",
  "human_message": "vault provider returned: connection refused",
  "resolution": { "type": "retry_after", "retry_after_seconds": 30 }
}
```

The action is **not** denied by policy, it is blocked because the daemon can't safely fulfill the credential request. Operators see this surfaced in `faramesh status`.

## RUNTIME_GAP

The runtime observed a behavior policy can't decide on (an async tool that never reported completion, an unknown MCP method, etc.). Always reported alongside another decision; useful in audit pipelines.

```json title="response.json"
{
  "code": "RUNTIME_GAP",
  "human_message": "tool 'long_task' completed asynchronously without faramesh/tasks/complete",
  "resolution": { "type": "manual_audit" }
}
```

## SDK handling

```python title="agent.py"
from faramesh import ToolDeniedException

try:
    result = tool.invoke(args)
except ToolDeniedException as denial:
    if denial.code == "POLICY_DEFER":
        return f"Pending approval: {denial.approval_id}"
    if denial.code in ("RATE_EXCEEDED", "DAEMON_NOT_READY"):
        wait(denial.resolution.retry_after_seconds)
        return retry()
    if denial.code == "BUDGET_EXCEEDED":
        return f"Budget reset at {denial.resolution.resets_at}"
    raise
```

```ts title="index.ts"
import { ToolDeniedError } from '@faramesh/sdk';

try {
  await tool.invoke(args);
} catch (err) {
  if (err instanceof ToolDeniedError) {
    if (err.code === 'POLICY_DEFER') return queueApproval(err.approvalId);
    if (err.resolution?.type === 'retry_after') return retryAfter(err.resolution.retryAfterSeconds);
    throw err;
  }
  throw err;
}
```

## What's next

- [Stack reference](/stack/): where every limit comes from
- [Security model](/security/)
- [CLI → audit](/cli/#audit): surface denials in real time
