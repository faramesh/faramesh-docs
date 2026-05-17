---
title: faramesh init
description: Generate governance.fms by detecting your framework and discovering tools.
---

`faramesh init` is the first command you run in any new agent project. It inspects your repository, picks a framework profile, finds every tool registration in source, and writes a `governance.fms` you can ship today.

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

Faramesh inspects your manifests in this order:

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

Every discovered tool is added as a comment plus a `defer` rule. You change them to `permit` after review.

## Output

A typical first run looks like this:

```
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

The generated file is intentionally minimal. The intent is to commit it, edit rules to fit your security posture, run `faramesh check`, and `faramesh apply`.

## What's next

- [Stack reference](/stack/): every block you can add to `governance.fms`
- [FPL language](/fpl/): full syntax
- [Providers](/providers/): declare Vault, AWS, GCP, Azure, SPIFFE
- [Quickstart](/quickstart/): five-step end-to-end walkthrough
