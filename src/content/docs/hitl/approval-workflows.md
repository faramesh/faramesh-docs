---
title: Approval Workflows
description: Designing HITL workflows for different risk levels and agent types.
---

Use approval workflows to separate ordinary allow rules from high-impact actions that need a human signoff.

The checked-in runtime can defer, poll, approve, deny, and resume. The SDK mirrors that model:

```python
action = submit_action("agent", "shell", "run", {"cmd": "ls"})
if action["status"] == "pending_approval":
    action = approve_action(action["id"], token=action["approval_token"])
```

Design your workflow around the action class, not the tool only. A refund of $25 and a refund of $25,000 are both `stripe/refund`, but they should not share the same review policy.

See [Slack Approval Routing](/hitl/slack-routing/) and [Email Approval Routing](/hitl/email-routing/).
