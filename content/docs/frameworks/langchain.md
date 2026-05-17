---
title: LangChain
description: Govern classic LangChain agents and chains with the SDK shim.
---

LangChain agents and chains are governed through the same SDK shim used by LangGraph. Wrap the tool list once and every call is evaluated by the Faramesh daemon.

**Tier:** SDK shim. **Latency overhead:** < 2 ms per call.

## Install

```bash title="Terminal"
pip install faramesh
```

## Wire an `AgentExecutor`

**Before**

```python title="agent.py"
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.tools import tool

@tool
def lookup_customer(email: str) -> str: ...

@tool
def refund_order(order_id: str, amount: float) -> str: ...

agent = create_openai_tools_agent(model, [lookup_customer, refund_order], prompt)
executor = AgentExecutor(agent=agent, tools=[lookup_customer, refund_order])
```

**After**

```python title="agent.py"
from faramesh import GovernedToolSet
from langchain.agents import AgentExecutor, create_openai_tools_agent

governed = GovernedToolSet(
    [lookup_customer, refund_order],
    agent_id="support-bot",
)

agent    = create_openai_tools_agent(model, governed, prompt)
executor = AgentExecutor(agent=agent, tools=governed)
```

Pass the **same** `GovernedToolSet` to both the agent factory and the `AgentExecutor`.

## Chains and `RunnableTools`

For chains that invoke tools through `RunnableTool` or `tool.bind`, the wrapper is the same, `GovernedToolSet` exposes the standard `BaseTool` interface.

```python title="agent.py"
from faramesh import GovernedToolSet

governed = GovernedToolSet([lookup_customer, refund_order], agent_id="support-bot")
chain    = prompt | model.bind_tools(governed) | parser
```

## Structured denials

Both `defer` and `deny` raise `ToolDeniedException`. Handle them in the agent loop:

```python title="agent.py"
from faramesh import ToolDeniedException

try:
    response = executor.invoke({"input": "Refund order 42 for $250"})
except ToolDeniedException as denial:
    if denial.code == "POLICY_DEFER":
        store_pending_approval(denial.approval_id)
        return "Refund queued for operator approval."
    raise
```

See [Denial codes](/errors/).

## Example `governance.fms`

```hcl title="governance.fms"
import "github.com/faramesh/faramesh-registry/frameworks/langgraph@1.0.0"

agent "support-bot" {
  default deny

  rules {
    permit lookup_customer
    permit refund_order if amount < $100
    defer  refund_order if amount >= $100
  }

  rate_limit "refund_order": 20 per hour

  budget daily {
    max       $1000
    warn_at   0.9
    on_exceed defer
  }
}
```

## Notes

- The shim recognizes both `@tool` decorators and `BaseTool` subclasses.
- Async tools are dispatched through `arun` automatically.
- Set `agent_id` per-process via `FARAMESH_AGENT_ID` if your code instantiates multiple agents.

## What's next

- [Quickstart](/quickstart/): full walkthrough
- [Stack reference](/stack/): full `governance.fms` syntax
- [Denial codes](/errors/)
