---
title: Deep Agents Deep Dive
description: How Deep Agents workloads run under Faramesh governance, including delegation, MCP boundaries, and operational rollout.
---

# Deep Agents Deep Dive

This page explains how to run Deep Agents workloads under Faramesh governance, where Faramesh intercepts execution, and how to roll out delegated and MCP-backed workflows safely.

## Core integration model

Deep Agents are governed by wrapping the runtime command with Faramesh:

```bash
faramesh run -- python -m deep_agents.main
```

That runtime path is the primary enforcement boundary documented in the Faramesh core technical guide.

## What Faramesh governs

- Pre-execution policy checks for tool and action dispatch.
- Permit, deny, and defer decision handling before the action runs.
- Centralized audit evidence for downstream review.
- Delegated and sub-agent activity when it crosses governed execution boundaries.

## Source-backed technical notes

The Faramesh core technical guide maps Deep Agents support to:

- `LangGraph dispatch + AgentMiddleware`

That means the important surfaces to validate are graph dispatch and middleware-driven execution paths, not just the top-level agent loop.

## Delegation guidance

When a Deep Agents workflow delegates work to a sub-agent:

1. Keep the supervisor scope explicit.
2. Limit tool scope and action ceilings.
3. Treat delegated actions as governed boundaries rather than free-form execution.
4. Verify audit output for the delegated path, not just the parent task.

## MCP interoperability

If the workflow uses MCP tools, route them through the Faramesh MCP boundary so they do not bypass governance:

```bash
faramesh mcp wrap -- node your-mcp-server.js
```

The underlying MCP interception specification covers the lower-level JSON-RPC and hardened HTTP surface.

## Operational rollout checklist

1. Start with one small task.
2. Confirm the task produces audit entries.
3. Test delegated/sub-agent execution.
4. Add stricter rules for risky tools.
5. Re-run the same task and confirm the expected deny/defer behavior.

## Validation commands

Use these checks from the Faramesh core docs when validating the runtime path:

```bash
go test ./internal/adapter/mcp ./cmd/faramesh ./internal/daemon
go test ./...
```

## Source references

- `faramesh-core/docs/power-users/frameworks/DEEP_AGENTS_TECHNICAL_GUIDE.md`
- `faramesh-core/docs/guides/frameworks/DEEP_AGENTS_QUICK_GUIDE.md`
- `faramesh-core/docs/power-users/FEATURES_TECHNICAL_REFERENCE.md`
- `faramesh-core/README.md`
