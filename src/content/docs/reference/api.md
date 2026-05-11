---
title: REST API Reference
description: HTTP API surfaces that are defined in the checked-in source.
---

This page documents the HTTP adapter routes that are explicitly present in the repository. The proxy adapter in `internal/adapter/proxy/server.go` exposes the following endpoints:

- `POST /v1/authorize`
- `POST /v1/scan_output`
- `POST /v1/approve`
- `GET /healthz`
- `POST /v1/defer/status`

The SDK adapter protocol in `internal/adapter/sdk/server.go` is socket-based rather than HTTP, but it is part of the same control surface:

- `govern`
- `poll_defer`
- `approve_defer`
- `standing_grant_add`
- `standing_grant_revoke`
- `standing_grant_list`
- `kill`
- `audit_subscribe`
- `callback_subscribe`
- `scan_output`

For the action-submission endpoints used by the SDK clients (`/v1/actions` and related paths), see the SDK client reference and the visibility/control-plane layer that consumes those calls.

See [SDK Client Reference](/reference/sdk-client/) and [Request Lifecycle](/architecture/request-lifecycle/).
