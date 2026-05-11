---
title: LlamaIndex Integration
description: Govern LlamaIndex tool use and retrieval-augmented execution.
---

The checked-in LlamaIndex adapter exposes `governed_function_tool()` and `govern_llamaindex_tools()` in `sdk/python/faramesh/adapters/llamaindex.py`.

`governed_function_tool()` wraps a function in a `FunctionTool` that requests governance before the function body runs. `govern_llamaindex_tools()` can also patch a list of existing tools in place.

```python
from faramesh.adapters.llamaindex import governed_function_tool

tool = governed_function_tool(search_docs, name="search_docs", policy_tool_id="docs/search")
```

That is the right pattern when your retrieval tool or function tool should be gated before it can reach internal data or external systems.

See [Govern Your Own Tool](/integrations/govern-your-own-tool/) and [Zero Trust Execution](/concepts/zero-trust-execution/).
