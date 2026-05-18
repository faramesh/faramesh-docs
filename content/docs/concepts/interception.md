---
title: Interception
description: The four tiers Faramesh uses to get in front of every agent action. SDK shim, MCP proxy, HTTP proxy, A2A proxy.
---

For Faramesh to evaluate a call, the call has to reach the daemon. **Interception** is how the call gets there. There are four tiers; most agents use one. You can combine them.

| Tier | Where it sits | Code change | Bypassable from inside the agent | Typical latency |
|------|---------------|-------------|----------------------------------|-----------------|
| **1. SDK shim** | In-process wrapper around the tool list | One line | Yes (mitigate with OS-tier on Linux) | < 2 ms |
| **2. MCP proxy** | A port the MCP client connects to | None (config only) | No | 3–8 ms |
| **3. HTTP proxy** | A port the hosted runtime calls | None (config only) | No | 5–15 ms |
| **4. A2A proxy** | A delegation gateway between agents | None (config only) | No | 4–10 ms |

## Tier 1. SDK shim

The shim is a small library you import in your agent code. It wraps the framework's tool list and turns every invocation into a daemon evaluation before the underlying function runs.

```python title="agent.py"
from faramesh import GovernedToolSet
tools = GovernedToolSet([search_docs, send_email], agent_id="my-agent")
```

```ts title="index.ts"
import { GovernedToolSet } from '@faramesh/sdk';

const tools = new GovernedToolSet([searchDocs, sendEmail], { agentId: 'my-agent' });
```

**How it routes.** The shim connects to the daemon at `FARAMESH_SOCKET` (Unix socket) or `FARAMESH_REMOTE_URL` (HTTPS). For local stacks the socket is the default; for serverless runtimes the HTTPS endpoint is used.

**What it sees.** The full structured arguments your framework passes to the tool. Conditions in policy can match on any of them.

**What it doesn't see.** Streaming chunks emitted by the tool after the first response. The initial decision is binding; subsequent chunks pass through.

**Bypass concern.** A malicious tool can theoretically call the underlying SDK directly and skip the shim. For untrusted agent code, combine with OS-tier enforcement (`enforcement { os_tier = true }`) on Linux.

## Tier 2. MCP proxy

The MCP proxy is a daemon-side port that speaks the **Model Context Protocol**. You point your MCP client (Claude Code, Cursor, OpenCode, your own) at the Faramesh port. The proxy forwards approved calls to the real upstream MCP server.

```text title="Output"
MCP client  ──MCP─►  Faramesh proxy (:8081)  ──MCP─►  Upstream MCP server
```

**Configured by:**

```hcl title="governance.fms"
runtime {
  mcp_proxy_port = 8081
}
```

**Tool naming.** Tools keep their upstream name. If the upstream advertises `fs_read`, you write `permit fs_read` in `governance.fms`. For multiple upstream servers, namespace the tool: `permit my-tools/fs_read`.

**Async tasks.** Some MCP servers return a deferred-task handle and call back when the work completes. Faramesh implements the `faramesh/tasks/complete` JSON-RPC extension; the upstream server reports the completion back through the proxy so the WAL records it. Servers that don't implement the extension produce a `RUNTIME_GAP` audit record.

**Multiple upstreams.** A single proxy can route to any number of upstream MCP servers; each gets a distinct prefix:

```jsonc
{
  "mcpServers": {
    "github":     { "url": "http://localhost:8081/mcp/github" },
    "filesystem": { "url": "http://localhost:8081/mcp/filesystem" }
  }
}
```

## Tier 3. HTTP proxy

The HTTP proxy is the wire-level gateway in front of a hosted agent runtime. Bedrock action groups, hosted MCP, or anything calling a REST endpoint as the tool surface.

```text title="Output"
Hosted agent runtime  ──HTTPS─►  Faramesh proxy (:8443)  ──HTTPS─►  Action group / API
```

**Configured by:**

```hcl title="governance.fms"
runtime {
  http_listen   = "0.0.0.0:8443"
  http_upstream = "https://lambda-url.example.com"
  tls_cert_file = "/etc/faramesh/server.crt"
  tls_key_file  = "/etc/faramesh/server.key"
}
```

**How tool names map.** The proxy reads the upstream OpenAPI document (or Bedrock action group schema) and maps each `operationId` to a tool name. Path parameters and bodies become condition variables:

```yaml title="config.yaml"
paths:
  /orders/{id}/refund:
    post:
      operationId: refund_order
      parameters:
        - { name: amount, in: query, schema: { type: number } }
```

```hcl title="governance.fms"
permit refund_order if amount < $100
```

**Headers and tokens.** The proxy can inject scoped credentials minted by a provider so the upstream sees only short-lived tokens; the hosted agent runtime never holds the long-lived key.

## Tier 4. A2A proxy

For multi-agent setups where agents delegate work to each other (the **Agent-to-Agent** pattern), Faramesh has a delegation gateway. Calls between agents flow through the proxy so delegation rules are enforced and recorded in the same audit trail as tool calls.

```hcl title="governance.fms"
agent "orchestrator" {
  delegate {
    target_agent = "researcher"
    scope        = "read-only"
    ttl          = "10m"
    ceiling      = "permit"
  }
}
```

**What it enforces.**

- The `scope` and `ttl` of the delegation.
- The `ceiling`, the maximum effect the delegate can grant (a delegate cannot upgrade `defer` to `permit`).
- That the delegating agent has the right to delegate (`spawn { allowed_types = ["researcher"] }`).

**Why it's separate from MCP.** A2A delegation is about agent identity passing across processes/runtimes, not about tool calls. The proxy validates the delegating SVID, attaches the delegation chain to every decision, and refuses calls when the chain violates policy.

## Combining tiers

Most production stacks use exactly one tier. Some combine them:

- **SDK shim + OS-tier.** SDK shim gives rich arg visibility; OS-tier (Linux seccomp + eBPF LSM) is the backstop if the agent goes hostile.
- **MCP proxy + HTTP proxy.** A coding agent that uses MCP tools and also calls a hosted Bedrock action group. Each call goes through its respective proxy; both write to the same WAL.
- **SDK shim + A2A proxy.** A native agent that delegates to other agents via A2A. The shim governs its own tool calls; the A2A proxy governs the delegations.

When you combine tiers, the daemon **de-duplicates** decisions: a single tool call only ever produces one DPR, no matter how many surfaces it traversed.

## Choosing a tier

```text title="Output"
Do you own the agent code?
├─ Yes ──► SDK shim (Tier 1)
└─ No  ──► Does it speak MCP?
           ├─ Yes ──► MCP proxy (Tier 2)
           └─ No  ──► Does it speak HTTP/OpenAPI?
                     ├─ Yes ──► HTTP proxy (Tier 3)
                     └─ No  ──► A2A proxy (Tier 4) for agent-to-agent
                              or open an issue. We want to cover your case.
```

## Shell, filesystem, and in-process tools

Tier 1 (SDK shim) governs **any callable the framework exposes as a tool**, not only HTTP or MCP:

| Action surface | How Faramesh sees it | Policy tool name |
|----------------|----------------------|------------------|
| `@tool` / `BaseTool` functions | Full args via `GovernedToolSet` | Tool name (e.g. `run_shell`) |
| Subprocess / shell wrappers | Same, if registered as a tool | `shell/run` or your chosen id |
| Filesystem read/write tools | Args (`path`, `mode`) in the CAR | `fs_read`, `fs_write`, … |
| Arbitrary Python callables | Wrap in `GovernedToolSet` or `@governed_tool` | Derived from function name |

**What Tier 1 does not automatically cover:** code inside the agent that bypasses the tool list (direct `requests.get`, raw `open()`, `os.system`). Mitigations:

1. **Linux OS-tier**: `enforcement { os_tier = true }` with seccomp/Landlock blocks syscalls and paths outside policy.
2. **Network proxy**: egress rules on the daemon HTTP proxy for outbound API calls that never go through a named tool.
3. **Process separation**: run the agent as an unprivileged user; run `faramesh apply` as the `faramesh` system user.

For MCP-only clients without source access, use **Tier 2** so every `tools/call` is proxied regardless of tool implementation.

## Arbitrary HTTP and non-MCP APIs

Agents often call REST, GraphQL, or vendor SDKs that are **not** MCP servers. Faramesh covers them in two ways:

1. **HTTP proxy (Tier 3)**: point the runtime or SDK at `FARAMESH_HTTP_PROXY`. Every outbound request is canonicalized to a tool id (OpenAPI `operationId` or configured route map) and evaluated before the upstream sees traffic. Use `egress { allow = [...] }` to deny unknown hosts.
2. **Named tools via SDK shim**: wrap each integration as a `@tool` / `GovernedToolSet` entry so policy matches on structured args even when the wire format is bespoke.

Calls that use neither surface (hard-coded sockets, DNS to arbitrary hosts) require **OS-tier** enforcement on Linux or network policy outside the agent process. Document your gaps with `faramesh check --strict` and extend `governance.fms` egress rules.

## What's next

- [Frameworks](/frameworks/): per-framework wiring
- [Enforcement](/concepts/enforcement/): what happens after interception
- [Auditing](/concepts/auditing/): what every decision records
