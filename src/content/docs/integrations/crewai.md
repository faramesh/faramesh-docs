---
title: CrewAI Integration
description: Govern CrewAI agents and tools with the autopatch path.
---

The checked-in source does not expose a standalone CrewAI adapter file, but it does expose the autopatch path that patches CrewAI’s tool execution. In `sdk/python/faramesh/autopatch.py`, the CrewAI hook targets `crewai.tools.BaseTool._run`.

That means CrewAI governance uses the same pattern as the other adapters: intercept the tool call before execution, submit the action to Faramesh, and only proceed when the decision allows it.

Use the generic `governed_tool()` decorator or the autopatch bootstrap when you want to govern CrewAI flows without changing your entire agent stack.

See [Govern Your Own Tool](/integrations/govern-your-own-tool/) and [Python SDK](/integrations/python-sdk/).
