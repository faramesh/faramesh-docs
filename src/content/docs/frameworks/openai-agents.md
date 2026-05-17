---
title: OpenAI Agents
description: Govern the OpenAI Agents SDK with the Faramesh SDK shim.
---

The OpenAI Agents SDK runs natively in your process. Faramesh provides a thin adapter that wraps the SDK's `FunctionTool` registry.

**Tier:** SDK shim. **Latency overhead:** < 2 ms per call.

## Install

<div>

```bash
pip install faramesh openai-agents
```

</div>

## Wire an agent

**Before**

```python
from openai.agents import Agent, function_tool

@function_tool
def lookup_inventory(sku: str) -> dict: ...

@function_tool
def place_order(sku: str, qty: int) -> dict: ...

agent = Agent(
    name="ops",
    instructions="...",
    tools=[lookup_inventory, place_order],
)
```

**After**

```python
from faramesh import GovernedToolSet
from openai.agents import Agent

tools = GovernedToolSet(
    [lookup_inventory, place_order],
    agent_id="ops",
)

agent = Agent(name="ops", instructions="...", tools=tools)
```

The adapter accepts the SDK's `function_tool`-decorated functions directly.

## Node SDK

```ts
import { Agent } from '@openai/agents';
import { governedTools } from '@faramesh/sdk';

const tools = governedTools(
  [lookupInventory, placeOrder],
  { agentId: 'ops' },
);

const agent = new Agent({ name: 'ops', instructions: '...', tools });
```

## Structured denials

```python
from faramesh import ToolDeniedException

try:
    result = await agent.run("Place an order for SKU-42")
except ToolDeniedException as denial:
    if denial.code == "POLICY_DEFER":
        await notify_operator(denial.approval_id)
        return "Order queued for approval."
    raise
```

## Example `governance.fms`

```fpl
import "registry.faramesh.dev/frameworks/openai-agents@1.0.0"

agent "ops" {
  default deny

  rules {
    permit lookup_inventory
    permit place_order if qty <= 10
    defer  place_order if qty > 10
  }

  rate_limit "place_order": 50 per hour
}
```

## What's next

- [Quickstart](/quickstart/) — full walkthrough
- [Stack reference](/stack/)
- [Denial codes](/errors/)
