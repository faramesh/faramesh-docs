---
title: LangGraph Deep Dive
description: Detailed design and integration guide for LangGraph with Faramesh.
---

---
title: LangGraph Deep Dive
description: How to run LangGraph workloads under Faramesh governance, with technical details, examples, and operational guidance.
---

# LangGraph Deep Dive

This page documents how to integrate LangGraph-based agent workloads with Faramesh, how Faramesh intercepts and governs graph tool calls, and practical rollout and hardening guidance.

## Key integration points

- Runtime wrapping: run your LangGraph process under Faramesh using the CLI wrapper:

```bash
faramesh run -- python your_langgraph_app.py
```

- Primary patch surface: Faramesh governs the framework by intercepting tool execution at the framework adapter layer (see: `BaseTool.run()` mapping in the codebase). The authoritative implementation notes are in the Faramesh core docs: `faramesh-core/docs/power-users/frameworks/LANGGRAPH_TECHNICAL_GUIDE.md`.

## Governance behavior for graph nodes

- Pre-execution deterministic policy evaluation (permit / deny / defer).
- Decision evidence is written tamper-evidently for audit trails.
- MCP-backed tool calls should be routed through an MCP boundary so they cannot bypass governance.

## Quick operational checklist

1. Install Faramesh and confirm CLI available (see `faramesh-core/README.md`).
2. Validate or author a starter policy (example: `examples/starter.fpl`).
3. Start your LangGraph app via `faramesh run -- <cmd>` and observe decisions via `faramesh audit tail`.
4. If LangGraph nodes call MCP tools, establish an MCP boundary:

```bash
faramesh mcp wrap -- node my-mcp-server.js
```

5. Run quick validation tests:

```bash
go test ./internal/adapter/mcp ./cmd/faramesh ./internal/daemon
```

## Rollout guidance

- Start in shadow mode to collect graph tool call inventory: `faramesh attach`.
- Build and validate a minimal policy that permits expected low-risk calls; defer or deny high-risk calls.
- Exercise main graph branches and confirm audit traces surface expected calls.
- Gradually increase enforcement from `shadow` → `audit` → `enforce`.

## Troubleshooting & common pitfalls

- Tool calls not appearing in audit: ensure the process was started with `faramesh run`.
- Unexpected denies: inspect FPL rules using `faramesh policy validate` and check policy match ordering.
- MCP tools bypassing governance: confirm MCP traffic is routed through the MCP gateway or use `faramesh mcp wrap`.

## Security & operations notes

- Credential broker: enable `--broker` for runs that require secret sequestration (see `run` command flags in `faramesh-core/cmd/faramesh/run.go`).
- Enforce least privilege for graph node identities; prefer short-lived agent identities and SPIFFE-style workloads when possible.
- Observe audit latency and error rates during load tests; collect traces and attach relevant request/response evidence for postmortem.

## Source references (code + docs)

- `faramesh-core/README.md` — high-level install and quick-start.
- `faramesh-core/cmd/faramesh/run.go` — CLI `run` behavior and flags (credential broker, auto-start, enforcement modes).
- `faramesh-core/docs/power-users/frameworks/LANGGRAPH_TECHNICAL_GUIDE.md` — power-user technical specifics.
- `faramesh-core/docs/guides/frameworks/LANGGRAPH_QUICK_GUIDE.md` — quick operational steps.

## Next steps (for this doc)

- Expand with concrete code snippets showing an instrumented LangGraph tool adapter that logs tool IDs and arguments before/after Faramesh decisions.
- Add end-to-end example repo demonstrating a LangGraph app run under Faramesh with an MCP-wrapped tool server.


