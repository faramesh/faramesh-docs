---
title: The Action Authorization Boundary (AAB)
description: The core protocol primitive in Faramesh.
---

The Action Authorization Boundary is the single chokepoint through which all agent actions must pass. If it does not go through the AAB, it does not happen.

The checked-in SDK protocol in `internal/adapter/sdk/server.go` shows the shape clearly: the client sends a `govern` request containing `call_id`, `agent_id`, `session_id`, `tool_id`, and `args`, and the server returns an effect such as `PERMIT`, `DENY`, or `DEFER` with a latency measurement and defer token when applicable.

```text
Intent submission -> Policy evaluation -> Execution gate
```

The AAB is protocol-agnostic. The same control logic applies whether the tool is REST, gRPC, shell, MCP, or a custom wrapper. The important part is that the agent calls the SDK, the SDK calls Faramesh, and the tool only runs when Faramesh says it may.

The request object keeps the identity boundary explicit: `agent_id`, `tool`, `operation`, `params`, `context`, and `timestamp` are the fields the docs and SDK surface revolve around.

:::caution
Fail-closed is the default. If the boundary is unreachable, execution should not continue unless you explicitly choose a less strict deployment posture for a known use case.
:::

See [Zero Trust Execution](/concepts/zero-trust-execution/) and [Request Lifecycle](/architecture/request-lifecycle/).
