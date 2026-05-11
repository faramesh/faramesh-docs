---
title: LangChain Integration
description: One-line governance for LangChain tools.
---

The checked-in Python adapter is `install_langchain_interceptor()` in `sdk/python/faramesh/adapters/langchain.py`. It patches `BaseTool.invoke`, `ainvoke`, `run`, and `arun`, and when enabled it also patches LangGraph ToolNode execution methods such as `_execute_tool_sync`, `_execute_tool_async`, `_run_one`, and `_arun_one`.

That means the control point is execution, not prompting. The wrapper inspects the tool call, sends a governed request, and only delegates to the original tool if the effect permits it.

```python
from faramesh.adapters.langchain import install_langchain_interceptor

install_langchain_interceptor(policy="policy.yaml", agent_id="support-agent")
```

Use this for LangChain and LangGraph agents that should inherit the same policy path without rewriting the rest of the agent graph.

See [LangGraph Integration](/integrations/langgraph/) and [Govern Your Own Tool](/integrations/govern-your-own-tool/).
