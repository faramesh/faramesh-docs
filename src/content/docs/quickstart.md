---
title: How do I get a governed agent running locally?
description: Five steps with LangGraph on a single machine.
---

Prerequisite: [Install Faramesh](/init/).

## 1. Initialize the stack

```bash
faramesh init
```

Example output:

```
Detected: LangGraph (pyproject.toml)
Tools discovered: 3
Wrote governance.fms
Next: faramesh check && faramesh plan && faramesh apply
```

Faramesh writes `governance.fms` with defer-by-default rules and a $10/day budget ceiling.

## 2. Start dev mode and run the agent

```bash
faramesh dev
```

In another terminal, run your agent with the governed tool set wired in (see [LangGraph](/frameworks/langgraph/)).

## 3. List pending approvals

```bash
faramesh approvals list
```

Deferred tool calls appear here until an operator approves them.

## 4. Permit reviewed tools

Edit `governance.fms` and change selected `defer` rules to `permit`, then:

```bash
faramesh check
faramesh apply
```

## 5. Verify status

```bash
faramesh status
```

Next: [Three repeatable flows](/flows/).
