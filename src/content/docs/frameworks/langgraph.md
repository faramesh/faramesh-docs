---
title: How do I govern LangGraph?
---

**Tier 1** — SDK shim.

**Before**

```python
tools = [search_docs, send_email]
graph = create_react_agent(model, tools)
```

**After**

```python
from faramesh import GovernedToolSet
tools = GovernedToolSet([search_docs, send_email], agent_id="my-agent")
graph = create_react_agent(model, tools)
```

Each tool call is evaluated by the daemon before execution.

- Profile: `registry.faramesh.dev/frameworks/langgraph`
- Test locally: [faramesh dev](/dev/)
