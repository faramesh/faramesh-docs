---
title: Python SDK
description: GovernedToolSet, ToolDeniedException, and the transport configuration for Faramesh's Python SDK.
---

The Python SDK is the in-process integration point for native frameworks — LangGraph, LangChain, CrewAI, OpenAI Agents, Google ADK, Anthropic SDK. Wrap your tool list with `GovernedToolSet`; every tool call is evaluated by the daemon before execution.

## Install

```bash
pip install faramesh
```

Supports Python 3.10+. Pure Python, no native extensions.

## `GovernedToolSet`

```python
from faramesh import GovernedToolSet

tools = GovernedToolSet(
    [search_docs, send_email, charge_card],
    agent_id="payments-bot",
)
```

Accepts:

- LangChain `BaseTool` subclasses
- LangChain `@tool` decorated functions
- OpenAI Agents `function_tool` decorated functions
- CrewAI `BaseTool` subclasses
- Plain callables — they become tools named after the function

The wrapped collection exposes the same interface as your framework expects. For LangChain it's a list of `BaseTool`; for OpenAI Agents it's the SDK's tool registry; for CrewAI it's a list of tool instances.

## Constructor parameters

```python
GovernedToolSet(
    tools,                       # iterable of tools
    agent_id="my-agent",         # required, must match an agent in governance.fms
    transport=None,              # auto-selected (see Transport)
    on_defer="raise",            # "raise" | "block" | callback
    on_deny="raise",
    timeout_seconds=10.0,
    fail_open=False,             # only ever True for explicit dev paths
)
```

| Parameter | Description |
|-----------|-------------|
| `agent_id` | Required. Matches `agent "<id>" { ... }` in `governance.fms`. Can also be set via `FARAMESH_AGENT_ID`. |
| `on_defer` | `raise` (default) raises `ToolDeniedException`. `block` blocks the call and polls for approval. A callback gets `(approval_id, denial)` for custom handling. |
| `on_deny` | Same shape; `block` is invalid here (denials never resolve). |
| `timeout_seconds` | Cap on the daemon round-trip. Default 10 s. |
| `fail_open` | If `True`, daemon-unreachable produces a permit with a warning DPR. **Never enable in production.** |

## `ToolDeniedException`

```python
from faramesh import ToolDeniedException

try:
    result = tool.invoke(args)
except ToolDeniedException as denial:
    denial.code           # "POLICY_DENY", "POLICY_DEFER", "RATE_EXCEEDED", ...
    denial.human_message  # free-form message
    denial.rule_ref       # "governance.fms:12"
    denial.resolution     # structured hint (retry_after, pending_approval, ...)
    denial.approval_id    # convenience for POLICY_DEFER
    denial.action_id      # the DPR id for this denial
```

`denial.resolution` mirrors the [denial code](/errors/) JSON shape. The fields you'll handle most:

| Resolution type | Fields |
|-----------------|--------|
| `pending_approval` | `approval_id` |
| `retry_after` | `retry_after_seconds` |
| `budget_reset` | `resets_at` |
| `rule_block` | `rule_id` |

## Async tools

`GovernedToolSet` dispatches async tools transparently. For a tool that defines both `arun` and `run`, the wrapper picks the matching method on invocation:

```python
async def my_tool(query: str) -> str:
    ...

graph = create_react_agent(model, GovernedToolSet([my_tool], agent_id="..."))
await graph.ainvoke({...})
```

## Transport selection

The SDK auto-selects how it talks to the daemon. Priority:

| Order | Variable | Mechanism |
|-------|----------|-----------|
| 1 | `FARAMESH_REMOTE_URL` | HTTPS POST `/v1/evaluate`. Use for serverless agents (Lambda, Cloud Run) where there is no local daemon. |
| 2 | `FARAMESH_SOCKET` | Unix socket JSON-RPC. The default for local stacks. Set by `faramesh apply` and `faramesh dev`. |
| 3 | `FARAMESH_BASE_URL` | HTTPS fallback for local stacks listening on a port instead of a socket. |

Optional:

| Variable | Description |
|----------|-------------|
| `FARAMESH_TOKEN` | Bearer token, required for remote and authenticated local. |
| `FARAMESH_AGENT_ID` | Default agent id for processes that wrap tools dynamically. |
| `FARAMESH_PRINCIPAL_TOKEN` | Pass-through identity claim (JWT) when the daemon trusts an upstream IDP. |

You can also pass a `Transport` instance directly:

```python
from faramesh.transport import HttpTransport, SocketTransport

tools = GovernedToolSet(
    [...],
    agent_id="payments-bot",
    transport=HttpTransport("https://eval.internal", token="..."),
)
```

## Logging and observability

The SDK ships its own structured logger. To wire it into your application's logger:

```python
import logging
logging.getLogger("faramesh").setLevel(logging.INFO)
```

It logs:

- Decision id and effect for every call
- Latency at the SDK boundary
- Daemon connectivity changes
- Transport fallbacks

The DPR itself is recorded by the daemon, not the SDK.

## Agent governance metadata

Some frameworks let you attach metadata to a tool call (LangChain `RunnableConfig`, OpenAI Agents context). The SDK forwards a known set of keys to the daemon as condition variables:

| Key | Becomes |
|-----|---------|
| `principal` | `principal.*` claim set |
| `session_id` | Session identifier for budget pooling |
| `request_id` | Correlation id surfaced in DPR |
| `tags` | Free-form tag list available in conditions as `tags` |

Anything else is dropped at the SDK boundary so policy can't accidentally branch on uncontrolled fields.

## Testing your wiring

```python
from faramesh.testing import StubTransport

tools = GovernedToolSet(
    [search_docs],
    agent_id="my-agent",
    transport=StubTransport({
        "search_docs": "permit",
    }),
)

# Now run your agent against the stub
```

`StubTransport` accepts a mapping from tool name to effect or a callable that takes the action payload and returns a decision. Use it in unit tests to assert your agent handles structured denials correctly.

## What's next

- [LangGraph](/frameworks/langgraph/) — full wiring example
- [LangChain](/frameworks/langchain/)
- [OpenAI Agents](/frameworks/openai-agents/)
- [CrewAI](/frameworks/crewai/)
- [Denial codes](/errors/) — every payload shape the SDK can raise
