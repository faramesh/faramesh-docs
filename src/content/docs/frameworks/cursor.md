---
title: Cursor
description: Govern Cursor's agent through the Faramesh MCP proxy.
---

Cursor's agent speaks MCP. Faramesh's MCP proxy sits between Cursor and any MCP server you've configured — your tool calls are evaluated by the daemon before they reach the upstream server.

**Tier:** MCP proxy. **Latency overhead:** 3–8 ms per call.

## How the wiring looks

```text
Cursor agent  →  Faramesh MCP proxy (port 8081)  →  Real MCP server
                          ↓
                  policy engine, WAL, providers
```

## Set up

### 1. Declare the proxy port in `governance.fms`

```fpl
import "registry.faramesh.dev/frameworks/mcp@1.0.0"

runtime {
  mode           = "enforce"
  mcp_proxy_port = 8081
}

agent "ide-agent" {
  default deny

  rules {
    permit fs_read
    permit search_codebase
    defer  fs_write
    deny   shell_exec
  }

  rate_limit "fs_write": 50 per minute
}
```

### 2. Start Faramesh

```bash
faramesh apply
```

### 3. Point Cursor at the proxy

In your project's MCP config (`.cursor/mcp.json` or the equivalent settings panel), set the MCP server URL to the proxy:

```json
{
  "servers": [
    {
      "name": "tools",
      "url": "http://localhost:8081/mcp"
    }
  ]
}
```

Any subsequent tool call is evaluated by Faramesh first.

## What the agent sees

| Decision | Result returned to the agent |
|----------|------------------------------|
| Permit | The upstream tool result. |
| Defer | A structured MCP error with `POLICY_DEFER` and an approval id. The agent can poll or notify you to approve in `faramesh approvals`. |
| Deny | A structured MCP error with `POLICY_DENY` and a human-readable reason. |

## Multiple MCP servers

You can route several MCP servers through the same Faramesh proxy. Use distinct names in your MCP config and prefix rules with the server name in policy:

```fpl
rules {
  permit github/list_repos
  permit github/create_issue
  defer  github/delete_repo
  permit filesystem/read_file
  deny   filesystem/delete_file
}
```

## What's next

- [Claude Code](/frameworks/claude-code/) — same MCP proxy
- [Stack reference → enforcement](/stack/#enforcement)
- [Denial codes](/errors/)
