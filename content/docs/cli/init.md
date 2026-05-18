---
title: faramesh init
description: Generate a starter governance.fms by detecting your framework and discovering tools.
---

`faramesh init` is the first command you run in any new agent project. It inspects your repository, picks a framework profile, finds every tool registration in source, and writes a starter `governance.fms` you can edit and ship.

This page is the full reference. For the five-minute walkthrough see [Quickstart](/quickstart/); for a fully worked agent see [Govern your first LangGraph agent](/guides/govern-a-langgraph-agent/).

:::note
`faramesh init` never starts the daemon. It only writes files. It refuses to overwrite an existing `governance.fms` (exit 1). Delete the file or pick a new directory to reinitialize.
:::

## Usage

```bash title="Terminal"
faramesh init [flags]
```

| Flag | Description |
|------|-------------|
| `--dir DIR` | Stack directory. Defaults to the current directory. |
| `--offline` | Don't write the registry `import` line. Useful for air-gapped setups. |
| `--non-interactive` | Skip prompts. Unknown frameworks produce a `TODO` import line you fill in by hand. |
| `--yaml` | Emit `governance.fms.yaml` (same AST, YAML syntax). |
| `--json` | Emit `governance.fms.json`. |

## Framework detection

Faramesh inspects your manifests in this order and picks the first match:

| Signal | Framework |
|--------|-----------|
| `langgraph` or `langchain` in `pyproject.toml` / `requirements*.txt` | LangGraph |
| `@langchain/langgraph` or `langchain` in `package.json` | LangGraph |
| `crewai` in deps | CrewAI |
| `autogen` / `ag2` in deps | AG2 |
| `google-adk` in deps | Google ADK |
| `openai-agents` / `@openai/agents` in deps | OpenAI Agents |
| `@anthropic-ai/sdk` or `anthropic` + tool patterns | Anthropic SDK |
| `strands-agents` in deps | Strands |
| `boto3` + Bedrock action group JSON | Bedrock |
| `fastmcp` / `@modelcontextprotocol/sdk` | MCP |
| `deepagents.toml`, `agents.toml`, or `AGENTS.md` | Deep Agents |

If more than one matches, Faramesh prompts you to choose. With `--non-interactive`, multiple matches resolve to an `unknown` framework and you select manually in `governance.fms`.

## Tool discovery

For Python and TypeScript projects, Faramesh scans for tool registrations and adds them to the rules block at `defer`:

| Framework | Patterns matched |
|-----------|------------------|
| LangGraph / LangChain | `@tool`, `Tool(`, `StructuredTool(`, `.tool(` |
| CrewAI | `@tool`, `Tool(`, `BaseTool` |
| AG2 | `register_function(`, `@register_for_execution`, `@register_for_llm` |
| Google ADK | `@tool`, `FunctionTool(`, `tools=[` |
| OpenAI Agents | `@function_tool`, `FunctionTool(`, `tools=[` |
| MCP | `server.tool(`, `@mcp.tool(`, `add_tool(` |
| Bedrock | `actionGroup` / `action_group` JSON entries |
| Deep Agents | `skills/*/SKILL.md` |

Every discovered tool is added as a comment plus a `defer` rule. **Defer is the safe default**: nothing runs until you explicitly review and promote each rule to `permit`.

## Output

A typical first run:

```text title="Output"
$ faramesh init
✓ Framework detected: langgraph
✓ Tools discovered: 3 (search_docs, send_email, charge_card)
✓ governance.fms written

Next steps:
  Run your agent with governance:
    faramesh dev
  Review what your agent is doing:
    faramesh approvals list
  When ready for full enforcement:
    faramesh apply
```

The generated file is intentionally minimal. The intent is: commit it, edit rules to fit your security posture, run [`faramesh check`](/cli/check/), then [`faramesh dev`](/cli/dev/) or [`faramesh apply`](/cli/apply/).

## Generated file

A typical Python LangGraph project produces something like:

```hcl title="governance.fms"
import "github.com/faramesh/faramesh-registry/frameworks/langgraph@1.0.0"

runtime {
  mode    = "enforce"
  wal_dir = "./faramesh-wal"
  backend = "sqlite"
}

agent "myproject-agent" {
  default deny

  rules {
    defer search_docs
    defer send_email
    defer charge_card
  }

  budget daily {
    max       $10
    on_exceed deny
  }

  egress { }
}
```

Three things to know about this file:

1. **`default deny`** is the only safe default. Every permit must be explicit.
2. **Every discovered tool is `defer`.** When the agent first runs, you'll see each tool show up in the approvals queue. That's the signal to either promote it to `permit` or leave it on a human-in-the-loop ladder.
3. **The `import` line is pinned.** The registry resolves at `faramesh check` time; pinned imports give you reproducible builds. `@latest` is rejected.

## What's next

- [Tune the policy](/cli/check/): validate your edits.
- [Run locally](/cli/dev/): start the daemon with in-process stubs.
- [FPL reference](/fpl/): every block you can add.
- [Stack reference](/stack/): block-by-block semantics.
- [Providers](/providers/): declare Vault, AWS, GCP, Azure, SPIFFE.
- [Quickstart](/quickstart/): the five-step end-to-end walkthrough.
