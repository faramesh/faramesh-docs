---
title: LangGraph Integration
description: Wrap LangGraph nodes so every tool call in the graph routes through Faramesh.
---

LangGraph is covered in the same interceptor code as LangChain. The Python adapter patches `ToolNode` execution methods directly, and the Node SDK’s LangChain integration also knows how to patch LangGraph tool node invocation paths.

The important detail is the execute layer. In the checked-in Python adapter, that is where governance happens for both synchronous and asynchronous dispatch.

```python
from faramesh.adapters.langchain import install_langchain_interceptor

install_langchain_interceptor(include_langgraph=True)
```

If you are building a LangGraph app, use the same pattern as any other governed runtime: intercept the tool call, evaluate it in Faramesh, and let the graph continue only on allow.

See [LangChain Integration](/integrations/langchain/) and [Request Lifecycle](/architecture/request-lifecycle/).
