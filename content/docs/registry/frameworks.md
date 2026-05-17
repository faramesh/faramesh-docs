---
title: Framework profiles
description: Import FPL wiring for SDK shim, MCP proxy, or HTTP proxy tiers from the GitHub catalog.
---

Framework profiles are **not binaries**. They are small FPL files that set `runtime` hints and default agent posture for a given framework family.

## Import

```hcl title="governance.fms"
import "github.com/faramesh/faramesh-registry/frameworks/langgraph@1.0.0"
```

`faramesh init` writes a matching import for the framework you select during setup.

## Official profiles

| Profile | Tier | Typical runtimes |
|---------|------|------------------|
| `langgraph`, `langchain`, `openai-agents`, `crewai` | SDK shim | In-process agents |
| `mcp`, `cursor`, `claude-code` | MCP proxy | Claude Code, Cursor, OpenCode |
| `bedrock` | HTTP proxy | Amazon Bedrock agents |

Each profile page under [Framework guides](/frameworks/) describes client-specific setup.

## Versioning

Pin `@1.0.0` (or newer catalog versions as they ship). Re-run `faramesh check` after bumping a pin to see compile-time diffs.

## Custom profiles

Fork the catalog repo, add `catalog/artifacts/frameworks/<name>/<version>/profile.fpl`, register in `catalog.json`, and distribute via your fork’s GitHub URL or `FARAMESH_REGISTRY_ROOT`.
