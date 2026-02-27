## LangChain integration

Faramesh can wrap LangChain tools so that every tool call is governed by policy and risk scoring.

### Basic pattern

```python
from langchain.tools import ShellTool
from faramesh.sdk import configure
from faramesh.integrations.langchain.governed_tool import GovernedTool

configure(base_url="http://127.0.0.1:8000", token="dev-token")

shell_tool = ShellTool()

governed_shell = GovernedTool(
    tool=shell_tool,
    agent_id="my-langchain-agent",
)

result = governed_shell.run("ls -la")
print(result)
```

Behind the scenes, `GovernedTool`:

1. Submits the tool call to Faramesh as an action.
2. Waits for a decision (allow / deny / require_approval).
3. If approval is required, waits until a human approves/denies.
4. Executes the original tool only if allowed/approved.
5. Reports the result back to Faramesh.

### Using with agents

```python
from langchain.agents import initialize_agent, AgentType
from langchain_openai import ChatOpenAI
from langchain.tools import ShellTool, RequestsGetTool

from faramesh.sdk import configure
from faramesh.integrations.langchain.governed_tool import GovernedTool

configure(base_url="http://127.0.0.1:8000", token="dev-token")

shell = ShellTool()
http = RequestsGetTool()

governed_tools = [
    GovernedTool(tool=shell, agent_id="agent-1"),
    GovernedTool(tool=http, agent_id="agent-1"),
]

llm = ChatOpenAI(model="gpt-4o-mini")

agent = initialize_agent(
    tools=governed_tools,
    llm=llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True,
)

response = agent.run("List files in /tmp and fetch https://example.com")
print(response)
```

### When to use it

- You want centralized visibility into LangChain tool calls.
- You need allow/deny/approval workflows for high‑risk tools (shell, db, payments).
- You want a single approval dashboard for multiple agents.

See `examples/langchain/governed_agent.py` and `examples/langchain/README.md` for full examples.

