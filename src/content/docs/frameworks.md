---
title: Frameworks
description: Pick how Faramesh wires into your agent. SDK shim, MCP proxy, HTTP proxy, or A2A.
---

Faramesh intercepts tool calls at the layer that best fits your agent runtime. There are four interception tiers, and most agents only need one.

| Tier | Mechanism | When to use it | Frameworks |
|------|-----------|----------------|------------|
| **1. SDK shim** | One-line wrapper around your tool list. | Native code agents you control. | LangGraph, LangChain, CrewAI, OpenAI Agents, Google ADK |
| **2. MCP proxy** | The agent talks MCP; Faramesh sits in the middle. | Off-the-shelf MCP clients you can't modify. | Claude Code, Cursor, OpenCode |
| **3. HTTP proxy** | Faramesh sits in front of the model/tool HTTP endpoint. | Vendor-hosted agent runtimes. | Bedrock, AgentOS |
| **4. A2A proxy** | Cross-agent delegation gateway. | Multi-agent and cross-vendor setups. | Any A2A-speaking agent |

Pick the tier that matches your runtime, then read the per-framework page.

## Native SDK frameworks

These get the **SDK shim**. You import `GovernedToolSet` (Python) or `governedTools` (Node) and pass it your tool list. Every tool call routes through the Faramesh daemon before execution.

- [LangGraph](/frameworks/langgraph/)
- [LangChain](/frameworks/langchain/)
- [OpenAI Agents](/frameworks/openai-agents/)
- [CrewAI](/frameworks/crewai/)

## MCP-based agents

Point the MCP client at the Faramesh proxy URL. Faramesh forwards approved calls to the real MCP server and denies / defers everything else.

- [Claude Code](/frameworks/claude-code/)
- [Cursor](/frameworks/cursor/)

## Hosted runtimes

Faramesh terminates HTTP at the proxy port and forwards approved calls to the vendor endpoint.

- [Bedrock](/frameworks/bedrock/)

## How tiers compare

| Property | SDK shim | MCP proxy | HTTP proxy |
|----------|----------|-----------|------------|
| Latency overhead | < 2 ms | 3–8 ms | 5–15 ms |
| Code change | One line | Zero (config only) | Zero (config only) |
| Tool-argument visibility | Full | Full | Full |
| Streaming responses | ✓ | ✓ | partial |
| Bypassable from inside the process | Yes (mitigated by OS-tier on Linux) | No | No |

For untrusted agents, combine SDK-tier with Linux OS-tier enforcement (`enforcement { os_tier = true }`).

## What's next

- [Stack reference](/stack/) — `enforcement` block per agent
- [Quickstart](/quickstart/) — end-to-end walkthrough with LangGraph
- [CLI](/cli/) — operating Faramesh once your framework is wired
