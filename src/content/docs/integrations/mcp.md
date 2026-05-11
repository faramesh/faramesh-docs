---
title: MCP (Model Context Protocol) Integration
description: Route MCP tool calls through Faramesh before they reach the real server.
---

The checked-in tree includes an MCP gateway in `internal/adapter/mcp/gateway.go`. The package comment is explicit: it intercepts MCP tool calls before they reach the actual server, using JSON-RPC 2.0 over stdio or HTTP.

The gateway can be run as a proxy around a real MCP server, and `faramesh serve` exposes flags for `--mcp-proxy-port` and `--mcp-target`.

```text
MCP Client -> Faramesh MCP Gateway -> Real MCP Server
```

This is the right control point for high-privilege tools because MCP often sits very close to production systems and service credentials.

See [Self-Hosted Deployment](/deployment/self-hosted/) and [Threat Model](/security/threat-model/).
