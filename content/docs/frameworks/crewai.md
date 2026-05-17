---
title: CrewAI
description: Govern CrewAI crews end-to-end with the SDK shim.
---

A CrewAI **crew** is a set of agents that hand work to one another. Faramesh governs every tool call any crew member makes, with one wrapper.

**Tier:** SDK shim. **Latency overhead:** < 2 ms per call.

## Install

```bash title="Terminal"
pip install faramesh crewai
```

## Wire a crew

**Before**

```python title="agent.py"
from crewai import Agent, Crew, Task
from crewai_tools import SerperDevTool, BraveSearchTool

researcher = Agent(
    role="researcher",
    tools=[SerperDevTool(), BraveSearchTool()],
)
writer = Agent(role="writer", tools=[])

crew = Crew(agents=[researcher, writer], tasks=[...])
```

**After**

```python title="agent.py"
from faramesh import GovernedToolSet
from crewai import Agent, Crew, Task

researcher_tools = GovernedToolSet(
    [SerperDevTool(), BraveSearchTool()],
    agent_id="research-crew/researcher",
)

researcher = Agent(role="researcher", tools=researcher_tools)
writer     = Agent(role="writer",     tools=[])

crew = Crew(agents=[researcher, writer], tasks=[...])
```

Use one `GovernedToolSet` per agent so each member has its own identity in policy.

## Per-role policy

```hcl title="governance.fms"
import "registry.faramesh.dev/frameworks/crewai@1.0.0"

agent "research-crew/researcher" {
  default deny

  rules {
    permit serper_search
    permit brave_search if query.length < 200
  }

  rate_limit "*_search": 30 per minute

  budget daily {
    max       $20
    on_exceed defer
  }
}

agent "research-crew/writer" {
  default deny
  rules { }
}
```

Faramesh tracks each role's budget, rate limit, and rule set independently.

## Inter-agent delegation

If your crew uses CrewAI's delegation feature, model it in policy with `delegate`:

```hcl title="governance.fms"
agent "research-crew/researcher" {
  delegate {
    target_agent = "research-crew/writer"
    scope        = "read-only"
    ttl          = "5m"
  }
}
```

The Faramesh daemon validates delegation against the crew's structure at runtime.

## What's next

- [Quickstart](/quickstart/)
- [Stack reference → delegate](/stack/#delegate)
- [Denial codes](/errors/)
