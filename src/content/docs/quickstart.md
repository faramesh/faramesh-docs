---
title: Quickstart
description: From an empty repo to a fully governed agent in under five minutes.
---

This page walks you all the way from installation to a tool call that is permitted, deferred, and approved — all with one `governance.fms` file.

The example uses **LangGraph**. The flow is identical for every other framework; only the wiring in step 4 changes.

## 1. Install the CLI

```bash
curl -fsSL https://raw.githubusercontent.com/faramesh/faramesh-core/main/install.sh | bash
faramesh version
```

Or `npx @faramesh/cli@latest` if you'd rather not install a binary globally.

## 2. Generate your stack

From the root of your agent project:

```bash
faramesh init
```

Sample output:

```
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

Faramesh writes a `governance.fms` like this:

```fpl
import "registry.faramesh.dev/frameworks/langgraph@1.0.0"

runtime {
  mode    = "enforce"
  wal_dir = "./faramesh-wal"
  backend = "sqlite"
}

agent "myproject-agent" {
  rules {
    defer search_docs
    defer send_email
    defer charge_card
  }

  budget daily {
    max       $10.00
    warn_at   0.8
    on_exceed deny
  }

  egress { }
}
```

Every discovered tool starts at `defer` so nothing runs without your review. This is the safe default.

## 3. Tune the policy

Open `governance.fms` and edit the rules. Read-only tools can usually go straight to `permit`; anything that costs money or sends data should stay deferred or be conditionally permitted.

```fpl
agent "myproject-agent" {
  rules {
    permit search_docs
    defer  send_email
    permit charge_card if amount < $50
    deny   charge_card if amount >= $50
  }

  rate_limit "charge_card": 5 per minute

  budget daily {
    max       $100.00
    warn_at   0.8
    on_exceed deny
  }

  egress {
    allow = ["api.openai.com", "api.stripe.com"]
  }
}
```

Validate before you ship:

```bash
faramesh check
faramesh plan
```

`plan` prints the exact decision diff so you know what changes when you apply.

## 4. Wire your agent

Drop the SDK shim into your code:

```python
from faramesh import GovernedToolSet
from langgraph.prebuilt import create_react_agent

tools = GovernedToolSet(
    [search_docs, send_email, charge_card],
    agent_id="myproject-agent",
)

graph = create_react_agent(model, tools)
```

That's the entire integration. Every tool call now traverses the Faramesh daemon before it executes.

> Using Claude Code, Cursor, or another MCP client? See [Frameworks → MCP](/frameworks/claude-code/) — point the client at the Faramesh proxy URL instead.

## 5. Apply and run

Start enforcement and run your agent normally:

```bash
faramesh apply
python my_agent.py
```

A `permit` call returns the tool result. A `defer` call returns a structured denial telling the agent its action is pending approval. Watch the inbox in another terminal:

```bash
faramesh approvals list
faramesh approvals approve apr-9001
```

Once approved, the agent's next attempt at `send_email` will succeed — or you can promote the rule to `permit` in `governance.fms` and `faramesh apply` again.

## What you now have

- **Every tool call** runs through a deterministic policy engine.
- **Every decision** is recorded in a tamper-evident WAL. Verify with `faramesh audit verify`.
- **Every credential** comes from a provider at call time. The agent never holds long-lived secrets.
- **Every deferred action** is visible in the approvals queue with full context.

## Next

- [Stack reference](/stack/) — every block in `governance.fms`
- [FPL language](/fpl/) — the grammar with examples
- [Workflows](/flows/) — first apply, change, monitor
- [CLI](/cli/) — every command
