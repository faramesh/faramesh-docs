---
title: DSPy Integration
description: Governing DSPy module execution with Faramesh.
---

I did not find a dedicated DSPy adapter file in the checked-in tree. The safe fallback is to use the generic governance path directly inside your DSPy module or wrapper.

The pattern is the same as every other integration in this repo: call `submit_action()` or use `governed_tool()` / `governedTool()` around the real work, then only execute on an allow decision.

If you are building a DSPy flow, treat the module boundary as the control point and keep the actual effectful call behind Faramesh.

See [Govern Your Own Tool](/integrations/govern-your-own-tool/) and [Python SDK](/integrations/python-sdk/).
