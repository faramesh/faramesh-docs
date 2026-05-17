---
title: Claude Code
description: Govern Claude Code via the Faramesh MCP proxy. No code change required.
---

Claude Code is an MCP client you don't modify. Faramesh ships an MCP **proxy** that speaks the same protocol on a port you control. Point Claude Code at the proxy URL and every tool call is evaluated by the daemon before reaching the real MCP server.

**Tier:** MCP proxy. **Latency overhead:** 3–8 ms per call.

## How the wiring looks

```text title="Output"
Claude Code  →  Faramesh MCP proxy (port 8081)  →  Real MCP server
                          ↓
                  policy engine, WAL, providers
```

The proxy is transparent. Approved calls forward to the upstream MCP server and the response streams back. Denied calls return a structured MCP error to Claude Code.

## Set up

### 1. Declare the proxy port

In `governance.fms`:

```hcl title="governance.fms"
import "github.com/faramesh/faramesh-registry/frameworks/mcp@1.0.0"

runtime {
  mode           = "enforce"
  mcp_proxy_port = 8081
}

agent "coding-agent" {
  default deny

  rules {
    permit fs_read
    permit run_tests
    defer  fs_write
    deny   shell_exec
  }
}
```

### 2. Start Faramesh

```bash title="Terminal"
faramesh apply
```

The proxy binds on `http://localhost:8081/mcp`.

### 3. Configure Claude Code

In your Claude Code MCP config, route the upstream MCP server through Faramesh:

```jsonc
{
  "mcpServers": {
    "my-tools": {
      "command": "/path/to/real-mcp-server",
      "args": [],
      "proxy": "http://localhost:8081"
    }
  }
}
```

Now every tool Claude Code calls, read, write, shell, search, passes through Faramesh first.

## Tool naming

The proxy preserves the upstream tool name. Reference tools in `governance.fms` exactly as the MCP server exposes them:

```hcl title="governance.fms"
rules {
  permit fs_read
  permit search_codebase
  defer  fs_write
  deny   shell_exec
}
```

For namespaced tools, use the server prefix:

```hcl title="governance.fms"
permit my-tools/fs_read
```

## Async tool completion

Some MCP servers return long-running tasks. Faramesh implements the `faramesh/tasks/complete` JSON-RPC extension, the upstream server calls it when a deferred task finishes, and the WAL records completion. See [Limitations](/limitations/).

## What's next

- [Cursor](/frameworks/cursor/): same proxy, different client
- [Stack reference → enforcement](/stack/#enforcement)
- [Denial codes](/errors/)
