---
title: Quickstart
description: From an empty repo to a fully governed agent in about five minutes. No infrastructure required.
---

## What you'll do

In the next five minutes you'll:

1. Install the Faramesh CLI.
2. Run `faramesh init` to write a starter `governance.fms`.
3. Wire one line of SDK code into your agent.
4. Watch a tool call get permitted, another get deferred, and approve the deferred one from the CLI.

You don't need Vault, SPIRE, KMS, Docker, or a cloud account. `faramesh dev` runs everything in-process. We'll cover moving to production at the end.

## Before you start

- **Faramesh CLI** — install from [GitHub releases](https://github.com/faramesh/faramesh-core/releases) or `brew install faramesh/tap/faramesh` when the tap is published.
- **Python 3.10+** for the example below. (TypeScript, Node, and Go SDKs work the same way; pick whichever matches your agent.)
- A project directory. Anything works — a fresh folder, your existing repo, a scratch space.

### How the pieces fit (very short version)

```text title="In your head"
your agent  ──► Faramesh SDK shim  ──► local daemon  ──► your tools
                  (one-line wrapper)    (governance.fms)
```

The shim turns every tool call into a question for the daemon: "is this allowed?" The daemon checks your policy and answers permit, defer, or deny. **Permit** runs the tool. **Defer** waits for human approval. **Deny** refuses with a structured reason.

That's the whole runtime. Everything else is detail.

### The five steps at a glance

| Step | Command | What it does |
|------|---------|-------------|
| 1 | `faramesh init` | Writes a starter `governance.fms` based on your framework |
| 2 | `faramesh dev` | Starts the daemon with in-process stubs for everything |
| 3 | One-line SDK wrapper | The agent now routes every call through the daemon |
| 4 | `faramesh approvals approve …` | Resolve a deferred call from the CLI |
| 5 | `faramesh apply` (later) | Replace stubs with real providers, persist the WAL, enable OS sandbox |

No Docker, Vault, or SPIRE required for steps 1–4. If you get stuck, jump to [Troubleshooting](/troubleshooting/).

---

The walkthrough below is the short version. For a fully worked example with a LangGraph agent, see [Tutorial: Govern your first LangGraph agent](/guides/govern-a-langgraph-agent/).

:::info
The example uses **LangGraph**. The flow is identical for every other framework; only the wiring in step 4 changes.
:::

## 1. Install the CLI

```bash title="Terminal"
curl -fsSL https://raw.githubusercontent.com/faramesh/faramesh-core/main/install.sh | bash
faramesh version
```

Or `npx @faramesh/cli@latest` if you'd rather not install a binary globally.

## 2. Generate your stack

From the root of your agent project:

```bash title="Terminal"
faramesh init
```

Sample output:

```text title="Output"
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

```hcl title="governance.fms"
import "github.com/faramesh/faramesh-registry/frameworks/langgraph@1.0.0"

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

:::tip[Safe default]
Every discovered tool starts at `defer` so nothing runs without your review.
:::

## 3. Tune the policy

Open `governance.fms` and edit the rules. Read-only tools can usually go straight to `permit`; anything that costs money or sends data should stay deferred or be conditionally permitted.

```hcl title="governance.fms"
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

```bash title="Terminal"
faramesh check
faramesh plan
```

:::note
`plan` prints the exact decision diff so you know what changes when you apply.
:::

## 4. Wire your agent

Drop the SDK shim into your code (Python or TypeScript):

<Tabs items={['Python', 'TypeScript']}>
<Tab value="Python">

```python title="agent.py"
import os
from faramesh import GovernedToolSet
from langgraph.prebuilt import create_react_agent

os.environ.setdefault("FARAMESH_AGENT_ID", "myproject-agent")

tools = GovernedToolSet(
    [search_docs, send_email, charge_card],
    agent_id="myproject-agent",
)

graph = create_react_agent(model, tools)
```

</Tab>
<Tab value="TypeScript">

```ts title="agent.ts"
import { GovernedToolSet } from '@faramesh/sdk';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

const tools = new GovernedToolSet([searchDocs, sendEmail, chargeCard], {
  agentId: 'myproject-agent',
});

const graph = createReactAgent({ llm: model, tools });
```

Set `FARAMESH_SOCKET` to the path printed by `faramesh dev` (default `~/.faramesh/runtime/faramesh.sock`).

</Tab>
</Tabs>

That's the entire integration. Every tool call now traverses the Faramesh daemon before it executes.

:::tip[MCP clients]
Using Claude Code, Cursor, or another MCP client? See [Frameworks → MCP](/frameworks/claude-code/) and point the client at the Faramesh proxy URL instead.
:::

## 5. Dev locally, then apply

<Tabs items={['Dev (no infra)', 'Apply (production path)']}>
<Tab value="Dev (no infra)">

```bash title="Terminal"
faramesh dev
# separate terminal:
export FARAMESH_SOCKET=~/.faramesh/runtime/faramesh.sock
python my_agent.py
```

</Tab>
<Tab value="Apply (production path)">

```bash title="Terminal"
faramesh apply
python my_agent.py
```

On macOS you will see a note that OS-tier seccomp/Landlock is Linux-only; application-tier enforcement still applies.

</Tab>
</Tabs>

A `permit` call returns the tool result. A `defer` call raises `ToolDeniedException` (Python) or `ToolDeniedException` (TypeScript) with a structured payload. Watch the inbox in another terminal:

```bash title="Terminal"
faramesh approvals list
faramesh approvals approve apr-9001
```

Once approved, the agent's next attempt at `send_email` will succeed, or you can promote the rule to `permit` in `governance.fms` and `faramesh apply` again.

## What you now have

- **Every tool call** runs through a deterministic policy engine.
- **Every decision** is recorded in a tamper-evident WAL. Verify with `faramesh audit verify`.
- **Every credential** comes from a provider at call time. The agent never holds long-lived secrets.
- **Every deferred action** is visible in the approvals queue with full context.

## Next

- [Stack reference](/stack/): every block in `governance.fms`
- [FPL language](/fpl/): the grammar with examples
- [Workflows](/flows/): first apply, change, monitor
- [CLI](/cli/): every command
