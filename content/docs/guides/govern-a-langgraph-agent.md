---
title: Tutorial — Govern your first LangGraph agent
description: Take an existing LangGraph agent, add Faramesh governance, and watch a deferred refund get approved by a human. No infra needed.
---

This tutorial takes about ten minutes. By the end you'll have a working LangGraph agent whose tool calls are governed by a policy you wrote, with a deferred call you approve from the CLI.

## What you'll build

A small LangGraph agent that has three tools:

- `search_docs` — read-only, always allowed
- `send_email` — should defer for human approval
- `charge_card` — should be allowed under $50, denied above

You'll watch each tool call go through the daemon, see the deferred call appear in the approvals queue, approve it from the CLI, and verify the audit trail.

## Prerequisites

- Python 3.10+
- The Faramesh CLI ([install instructions](/quickstart/#1-install-the-cli))
- Your favorite LLM API key (the policy logic doesn't care which model)

## 1. Set up the project

```bash title="Terminal"
mkdir refund-bot && cd refund-bot
python -m venv .venv && source .venv/bin/activate
pip install langgraph langchain-openai faramesh-sdk==0.3.3
```

## 2. Write the agent

Create `agent.py`:

```python title="agent.py"
import os
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from faramesh import GovernedToolSet

@tool
def search_docs(query: str) -> str:
    """Search internal documentation."""
    return f"docs match for '{query}': order shipping policy applies"

@tool
def send_email(to: str, subject: str, body: str) -> str:
    """Send an email to a customer."""
    return f"sent to {to}"

@tool
def charge_card(customer_id: str, amount: float) -> str:
    """Charge a customer's card."""
    return f"charged ${amount} to {customer_id}"

tools = GovernedToolSet(
    [search_docs, send_email, charge_card],
    agent_id="refund-bot",
)

model = ChatOpenAI(model="gpt-4o-mini")
graph = create_react_agent(model, tools)

if __name__ == "__main__":
    result = graph.invoke({
        "messages": [{"role": "user", "content": "Look up our shipping policy."}],
    })
    print(result["messages"][-1].content)
```

The only Faramesh-specific lines are the `from faramesh import GovernedToolSet` and the `tools = GovernedToolSet(...)` wrapper. Your existing tools and graph are unchanged.

## 3. Generate a policy

```bash title="Terminal"
faramesh init
```

Faramesh detects that this is a LangGraph project and writes `governance.fms` with all three tools deferred by default (the safe starting point). Open it and tune the rules:

```hcl title="governance.fms"
import "github.com/faramesh/faramesh-registry/frameworks/langgraph@1.0.0"

runtime {
  mode    = "enforce"
  wal_dir = "./faramesh-wal"
  backend = "sqlite"
}

agent "refund-bot" {
  default deny

  rules {
    permit search_docs
    defer  send_email
    permit charge_card if amount < 50
    deny   charge_card
  }

  rate_limit "charge_card": 5 per minute

  budget daily {
    max       $100
    on_exceed deny
  }
}
```

What this says:
- `search_docs` always runs.
- `send_email` always defers — a human has to approve every email.
- `charge_card` runs if amount is under $50; otherwise it's denied.
- Card charges are rate-limited to 5/minute and capped at $100/day.

Validate it:

```bash title="Terminal"
faramesh check
```

## 4. Start the daemon

`faramesh dev` runs the daemon with in-process stubs for Vault, SPIFFE, and KMS. No infrastructure required.

```bash title="Terminal"
faramesh dev
```

You'll see output ending in `→ Unix socket: ~/.faramesh/runtime/faramesh.sock`. Leave this terminal running.

## 5. Run the agent

In a second terminal:

```bash title="Terminal"
source .venv/bin/activate
export OPENAI_API_KEY=sk-...
export FARAMESH_AGENT_ID=refund-bot
python agent.py
```

The agent calls `search_docs`, the daemon permits it, you see the result.

Now ask it to do something that defers. Edit `agent.py` to ask:

```python
result = graph.invoke({
    "messages": [{"role": "user", "content": "Email customer 123 about their delayed order."}],
})
```

Run it again. The model decides to call `send_email`. The daemon defers. Your script raises `ToolDeniedException`. The agent loop reports the deferral instead of sending mail.

## 6. Approve the deferred call

In a third terminal:

```bash title="Terminal"
faramesh approvals list
```

You'll see your `send_email` call sitting there:

```text title="Output"
APPROVAL ID  AGENT       TOOL        AGE  CONTEXT
apr-9001     refund-bot  send_email  3s   to=customer@…
```

Approve it:

```bash title="Terminal"
faramesh approvals approve apr-9001 --reason "manual review passed"
```

The next time the agent runs that same call, the daemon permits it once and writes a DPR linking the operator who approved it.

## 7. Verify the audit trail

```bash title="Terminal"
faramesh audit verify
```

You'll see a hash-chain verification report covering every decision. The signed records are stored under `.faramesh/`.

## What you just did

| Step | What happened |
|------|---------------|
| 1–2 | Built a normal LangGraph agent with three tools. |
| 3 | Wrote a policy declaring what's allowed (`permit`), what waits (`defer`), what's blocked (`deny`). |
| 4 | Started the daemon in dev mode (stubbed providers). |
| 5 | The SDK shim sent every tool call through the daemon before it ran. |
| 6 | A deferred call became an approvable record. The human is in the loop. |
| 7 | Every decision is a tamper-evident audit record. |

Crucially, **none of your agent code knows or cares about Faramesh** beyond the one-line wrapper. Switching the agent to LangChain, CrewAI, or OpenAI Agents would change the framework imports — the policy stays exactly the same.

## Where to go next

- [Write your first policy](/guides/your-first-policy/) — author `governance.fms` from scratch.
- [Debug a denial](/guides/debugging-denials/) — what to do when something denies you didn't expect.
- [From dev to production](/guides/from-dev-to-prod/) — replace stubs with real Vault/SPIFFE/KMS.
- [Architecture](/concepts/architecture/) — the supervisor and OS-tier sandbox.
