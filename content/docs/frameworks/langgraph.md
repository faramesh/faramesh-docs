---
title: LangGraph
description: Govern LangGraph agents with the SDK shim. One line of code.
---

LangGraph runs natively in your process. Faramesh wraps your tool list so every `tool_node` invocation is evaluated by the daemon before execution.

**Tier:** SDK shim. **Latency overhead:** < 2 ms per call.

## Install

```bash title="Terminal"
pip install faramesh
```

## Wire your agent

**Before**

```python title="agent.py"
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool

@tool
def search_docs(query: str) -> str: ...

@tool
def send_email(to: str, body: str) -> str: ...

graph = create_react_agent(model, [search_docs, send_email])
```

**After**

```python title="agent.py"
from faramesh import GovernedToolSet
from langgraph.prebuilt import create_react_agent

tools = GovernedToolSet(
    [search_docs, send_email],
    agent_id="my-agent",          # matches agent "my-agent" in governance.fms
)

graph = create_react_agent(model, tools)
```

That's the entire integration.

## What happens at runtime

1. The graph picks a tool to call.
2. `GovernedToolSet` intercepts the call before LangGraph executes it.
3. The Faramesh daemon evaluates the action against your policy.
4. **Permit** → the tool runs. **Defer** → a `ToolDeniedException` (pending approval) returns to the graph. **Deny** → a `ToolDeniedException` (final) returns.
5. The decision is recorded in the WAL.

## Handling structured denials

Both `defer` and `deny` raise `ToolDeniedException`. Inspect the structured payload to decide how the graph should react:

```python title="agent.py"
from faramesh import ToolDeniedException

try:
    result = tool.invoke(args)
except ToolDeniedException as denial:
    if denial.code == "POLICY_DEFER":
        # show the user that the call is pending operator approval
        return f"Action queued for approval: {denial.approval_id}"
    elif denial.code == "BUDGET_EXCEEDED":
        return "Daily budget exhausted; the run will resume tomorrow."
    raise
```

See [Denial codes](/errors/) for the full list.

## Example `governance.fms`

```hcl title="governance.fms"
import "github.com/faramesh/faramesh-registry/frameworks/langgraph@1.0.0"

runtime {
  mode    = "enforce"
  wal_dir = "./faramesh-wal"
}

agent "my-agent" {
  default deny

  rules {
    permit search_docs
    defer  send_email
  }

  budget daily {
    max       $50.00
    warn_at   0.8
    on_exceed deny
  }
}
```

## Authentication

If your stack uses a Vault provider, the SDK never sees the credential. The daemon mints a scoped, short-lived token at call time and injects it directly into the tool invocation.

## Notes

- The shim supports both `@tool` functions and `BaseTool` subclasses.
- For async tools, use the same `GovernedToolSet`, it transparently dispatches `arun`.
- `agent_id` may be passed at construction or via `FARAMESH_AGENT_ID`.

## What's next

- [Quickstart](/quickstart/): full walkthrough
- [Stack reference](/stack/): what else you can put in `governance.fms`
- [Denial codes](/errors/): every structured error agents can receive
