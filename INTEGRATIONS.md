# Framework Integrations

Faramesh provides **one-line governance** for any agent framework. Drop in governance with a single function call.

## Quick Reference

```python
# LangChain
from faramesh.integrations import govern_langchain_tool
tool = govern_langchain_tool(ShellTool(), agent_id="my-agent")

# CrewAI
from faramesh.integrations import govern_crewai_tool
tool = govern_crewai_tool(FileReadTool(), agent_id="my-agent")

# AutoGen
from faramesh.integrations import govern_autogen_function
func = govern_autogen_function(my_function, agent_id="my-agent")

# MCP
from faramesh.integrations import govern_mcp_tool
tool = govern_mcp_tool(my_tool, agent_id="my-agent")

# LangGraph (wrap nodes)
from faramesh.sdk.client import ExecutionGovernorClient
client = ExecutionGovernorClient("http://127.0.0.1:8000")
# Submit in node function before execution

# LlamaIndex (wrap tool functions)
from faramesh.sdk.client import ExecutionGovernorClient
client = ExecutionGovernorClient("http://127.0.0.1:8000")
# Submit in tool function before execution

# Universal (auto-detects framework)
from faramesh.integrations import govern
tool = govern(any_tool, agent_id="my-agent")
```

## LangChain

### Installation

```bash
pip install langchain faramesh
```

### One-Line Integration

```python
from langchain.tools import ShellTool
from faramesh.integrations import govern_langchain_tool

# One line!
tool = govern_langchain_tool(ShellTool(), agent_id="my-agent")

# Use in agent
from langchain.agents import initialize_agent, AgentType

agent = initialize_agent(
    tools=[tool],
    llm=llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION
)
```

### Full Example

See [`examples/langchain/governed_agent.py`](../examples/langchain/governed_agent.py)

## CrewAI

### Installation

```bash
pip install crewai crewai-tools faramesh
```

### One-Line Integration

```python
from crewai_tools import FileReadTool
from faramesh.integrations import govern_crewai_tool

# One line!
tool = govern_crewai_tool(FileReadTool(), agent_id="researcher")

# Use in agent
from crewai import Agent, Task, Crew

agent = Agent(
    role='Researcher',
    tools=[tool],  # Governed tool
    verbose=True
)
```

### Full Example

See [`examples/crewai/governed_agent.py`](../examples/crewai/governed_agent.py)

## AutoGen

### Installation

```bash
pip install pyautogen faramesh
```

### One-Line Integration

```python
import autogen
from faramesh.integrations import govern_autogen_function

def my_function(url: str) -> str:
    import requests
    return requests.get(url).text

# One line!
governed_func = govern_autogen_function(
    my_function,
    agent_id="assistant",
    tool_name="http_get"
)

# Use in agent
agent = autogen.AssistantAgent(
    name="assistant",
    function_map={"http_get": governed_func}
)
```

### Full Example

See [`examples/autogen/governed_agent.py`](../examples/autogen/governed_agent.py)

## MCP (Model Context Protocol)

### Installation

```bash
pip install mcp faramesh
```

### One-Line Integration

```python
from faramesh.integrations import govern_mcp_tool

def my_mcp_tool(query: str) -> str:
    return f"Result: {query}"

# One line!
tool = govern_mcp_tool(my_mcp_tool, agent_id="my-agent")

# Use in MCP server
from mcp import Server

server = Server("my-server")
server.register_tool("my_tool", tool)
```

### Full Example

See [`examples/mcp/governed_tool.py`](../examples/mcp/governed_tool.py)

## Universal One-Liner

Auto-detect framework and apply governance:

```python
from faramesh.integrations import govern

# Auto-detects LangChain
tool = govern(ShellTool(), agent_id="my-agent")

# Auto-detects CrewAI
tool = govern(FileReadTool(), agent_id="my-agent")

# Auto-detects function (AutoGen)
func = govern(my_function, agent_id="my-agent")

# Explicit framework
tool = govern(my_tool, agent_id="my-agent", framework="mcp")
```

## How It Works

All integrations follow the same pattern:

1. **Wrap tool/function** with governance wrapper
2. **Intercept calls** before execution
3. **Submit to Faramesh** for policy evaluation
4. **Wait for approval** if `require_approval: true`
5. **Execute only if allowed**
6. **Report results** back to Faramesh

## Configuration

### Base URL

Default: `http://127.0.0.1:8000`

Override:

```python
tool = govern_langchain_tool(
    ShellTool(),
    agent_id="my-agent",
    base_url="http://faramesh.example.com:8000"
)
```

### Approval Timeout

Default: 300 seconds (5 minutes)

Override:

```python
tool = govern_langchain_tool(
    ShellTool(),
    agent_id="my-agent",
    max_wait_time=600  # 10 minutes
)
```

### Poll Interval

Default: 2 seconds

Override:

```python
tool = govern_langchain_tool(
    ShellTool(),
    agent_id="my-agent",
    poll_interval=1.0  # Check every second
)
```

## Policy Configuration

All governed tools respect your Faramesh policy. Create `policies/default.yaml`:

```yaml
rules:
  # Require approval for shell commands
  - match:
      tool: "shell"
      op: "*"
    require_approval: true
    risk: "medium"

  # Allow HTTP GET
  - match:
      tool: "http"
      op: "get"
    allow: true
    risk: "low"

  # Default deny
  - match:
      tool: "*"
      op: "*"
    deny: true
```

See [Policy Packs](../policies/packs/) for ready-to-use policies.

## Error Handling

All integrations raise `PermissionError` when actions are denied:

```python
try:
    result = tool.run("rm -rf /")
except PermissionError as e:
    print(f"Action denied: {e}")
```

## Best Practices

1. **Use descriptive agent_id** - helps with policy matching and audit logs
2. **Set appropriate timeouts** - don't wait forever for approval
3. **Handle PermissionError** - gracefully handle denied actions
4. **Monitor in UI** - open `http://127.0.0.1:8000` to see all actions
5. **Use policy packs** - start with ready-made policies

## LangGraph

### Installation

```bash
pip install langgraph faramesh
```

### One-Line Integration

For simple cases, wrap tool calls in graph nodes:

```python
from langgraph.graph import StateGraph, END
from faramesh import submit_action, wait_for_completion

def http_node(state):
    # Submit action to Faramesh
    action = submit_action(
        agent_id="langgraph-demo",
        tool="http",
        operation="get",
        params={"url": state["url"]}
    )
    
    # Wait for approval if needed
    if action['status'] == 'pending_approval':
        final = wait_for_completion(action['id'], timeout=300.0)
        if final['status'] == 'denied':
            return {"error": "Action denied"}
        action = final
    
    # Execute if allowed
    if action['status'] in ('allowed', 'approved'):
        import requests
        result = requests.get(state["url"])
        return {"result": result.text}
    
    return {"error": "Action not allowed"}

graph = StateGraph(dict)
graph.add_node("http", http_node)
graph.set_entry_point("http")
graph.add_edge("http", END)
app = graph.compile()
result = app.invoke({"url": "https://example.com"})
```

### Full Example

See [`examples/langgraph/governed_graph.py`](../examples/langgraph/governed_graph.py)

## LlamaIndex

### Installation

```bash
pip install llama-index faramesh
```

### One-Line Integration

Wrap tool functions with Faramesh:

```python
from llama_index.core.tools import FunctionTool
from faramesh import submit_action, wait_for_completion

def http_get(url: str) -> str:
    # Submit action to Faramesh
    action = submit_action(
        agent_id="llamaindex-demo",
        tool="http",
        operation="get",
        params={"url": url}
    )
    
    # Wait for approval if needed
    if action['status'] == 'pending_approval':
        final = wait_for_completion(action['id'], timeout=300.0)
        if final['status'] == 'denied':
            raise PermissionError("Action denied")
        action = final
    
    # Execute if allowed
    if action['status'] in ('allowed', 'approved'):
        import requests
        return requests.get(url).text
    
    raise PermissionError("Action not allowed")

tool = FunctionTool.from_defaults(
    fn=http_get,
    name="http_get",
    description="Fetch a URL"
)
```

### Full Example

See [`examples/llamaindex/governed_agent.py`](../examples/llamaindex/governed_agent.py)

## Next Steps

- See [Govern Your Own Tool](./govern-your-own-tool.md) for custom integrations
- Check [Policy Packs](../policies/packs/) for ready-to-use policies
- Read framework-specific docs:
  - [LangChain Integration](./LangChain%20integration.md)
  - [CrewAI Example](../examples/crewai/README.md)
  - [AutoGen Example](../examples/autogen/README.md)
  - [MCP Example](../examples/mcp/README.md)
  - [LangGraph Example](../examples/langgraph/README.md)
  - [LlamaIndex Example](../examples/llamaindex/README.md)
