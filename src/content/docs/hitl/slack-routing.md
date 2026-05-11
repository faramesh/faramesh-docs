---
title: Slack Approval Routing
description: Route pending actions to Slack for one-click approval or rejection.
---

Slack routing is part of the server-side defer workflow surfaced in the daemon configuration. The checked-in tree includes Slack webhook support for defer notifications, and the admin flow can carry the action into a review queue.

Use this when reviewers live in Slack and you want the approval path to be fast but still explicit.

The safer pattern is to keep the action details on the dashboard or approval payload and use Slack only as the routing surface.

See [Human-in-the-Loop Overview](/hitl/overview/) and [Web UI & Dashboard](/hitl/web-ui/).
