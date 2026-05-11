---
title: Human-in-the-Loop (HITL) Overview
description: How Faramesh routes high-risk or policy-flagged actions to humans.
---

When a rule returns `defer`, the action is queued until a reviewer approves or denies it. That is the Human-in-the-Loop path the runtime and SDK both understand.

The Python SDK exposes `block_until_approved()`, and the Node SDK exposes `blockUntilApproved()` with the same basic behavior. The audit stream and callback stream keep the action visible while it is pending.

Approval channels in the checked-in tree include the web UI, the live audit stream, Slack webhook routing, and PagerDuty escalation hooks in the daemon configuration.

:::caution
Fail-closed is the default. If no reviewer responds inside the timeout window, the safe behavior is to keep the action blocked.
:::

Read [Approval Workflows](/hitl/approval-workflows/) and [Web UI & Dashboard](/hitl/web-ui/).
