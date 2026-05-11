---
title: AutoGen Integration
description: Govern AutoGen function calling before execution.
---

The checked-in autopatch path also includes AutoGen / AG2. The hook in `sdk/python/faramesh/autopatch.py` targets `autogen.ConversableAgent._execute_tool_call`, which is the actual execution point for the tool call.

That makes the wrapper behavior simple: the call is intercepted, a governed decision is requested, and the underlying tool only executes if the decision says it may.

Use this path when you need to govern AutoGen without changing how the rest of the agent is assembled.

See [Govern Your Own Tool](/integrations/govern-your-own-tool/) and [Zero Trust Execution](/concepts/zero-trust-execution/).
