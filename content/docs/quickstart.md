---
title: Quickstart
description: From an empty repo to a governed agent in about five minutes. No infrastructure required.
---

## What you will do

1. Install the Faramesh CLI.
2. Run `faramesh init` to write a starter `governance.fms`.
3. Add one line of SDK code to your agent.
4. Watch one tool call get permitted, another get deferred, and approve the deferred one from the CLI.

Vault, SPIRE, KMS, Docker, and a cloud account are not required. `faramesh dev` runs everything in-process. The migration to production is covered at the end.

## Before you start

- The Faramesh CLI. Installed from source or a release binary, instructions below.
- Python 3.10 or later for the example. The TypeScript, Node, and Go SDKs follow the same flow.
- A project directory. Any directory works.

### How the pieces fit

```text title="In your head"
your agent  ──►  Faramesh SDK shim  ──►  local daemon  ──►  your tools
                 (one-line wrapper)      (governance.fms)
```

The shim turns every tool call into a question for the daemon: is this allowed? The daemon checks your policy and answers with one of three effects. `permit` runs the tool. `defer` waits for human approval. `deny` refuses with a structured reason.

That is the entire runtime. Everything else is detail.

### The five steps at a glance

| Step | Command | What it does |
|------|---------|-------------|
| 1 | `faramesh init` | Writes a starter `governance.fms` based on your framework. |
| 2 | `faramesh dev` | Starts the daemon with in-process stubs for everything. |
| 3 | One-line SDK wrapper | The agent now routes every tool call through the daemon. |
| 4 | `faramesh approvals approve ...` | Resolves a deferred call from the CLI. |
| 5 | `faramesh apply` (later) | Replaces stubs with real providers, persists the WAL, enables the OS sandbox. |

No Docker, Vault, or SPIRE is required for steps 1 through 4. For problems, see [Troubleshooting](/troubleshooting/).

The walkthrough below is the short version. For a fully worked example with a LangGraph agent, see [Tutorial: Govern your first LangGraph agent](/guides/govern-a-langgraph-agent/).

:::info
The example uses **LangGraph**. The flow is identical for every other framework; only the SDK wiring in step 4 changes.
:::

## 1. Install the CLI

Two options. Pick one.

### Option A: install script (recommended)

```bash title="Terminal"
curl -fsSL https://raw.githubusercontent.com/faramesh/faramesh-core/main/install.sh | bash
faramesh version
```

The script downloads the latest release binary for your platform, verifies the SHA256 checksum, and places `faramesh` on your `PATH`. It does not require root unless you choose a system-wide install location.

### Option B: build from source

```bash title="Terminal"
git clone https://github.com/faramesh/faramesh-core.git
cd faramesh-core
go build -o faramesh ./cmd/faramesh
sudo install -m 0755 faramesh /usr/local/bin/faramesh
faramesh version
```

Requires Go 1.22 or later. Useful if you want to track `main` or modify the CLI.

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

Open `governance.fms` and edit the rules. Read-only tools can usually move directly to `permit`. Anything that spends money or sends data outside should stay deferred or be conditionally permitted.

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

Validate before shipping:

```bash title="Terminal"
faramesh check
faramesh plan
```

:::note
`plan` prints the exact decision diff so you can see what will change when you apply.
:::

## 4. Wire your agent

Add the SDK shim to your code, Python or TypeScript.

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

That is the entire integration. Every tool call now traverses the Faramesh daemon before it executes.

:::tip[MCP clients]
Using Claude Code, Cursor, or another MCP client? See [Frameworks > MCP](/frameworks/claude-code/) and point the client at the Faramesh proxy URL instead.
:::

## 5. Develop locally, then apply

<Tabs items={['Dev (no infrastructure)', 'Apply (production path)']}>
<Tab value="Dev (no infrastructure)">

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

On macOS the CLI prints a note that OS-tier seccomp and Landlock are Linux-only. Application-tier enforcement still applies.

</Tab>
</Tabs>

A `permit` call returns the tool result. A `defer` call raises `ToolDeniedException` (Python or TypeScript) with a structured payload. Watch the inbox in another terminal:

```bash title="Terminal"
faramesh approvals list
faramesh approvals approve apr-9001
```

Once approved, the agent's next attempt at `send_email` succeeds. Alternatively, promote the rule to `permit` in `governance.fms` and run `faramesh apply` again.

## What you now have

- **Every tool call** runs through a deterministic policy engine.
- **Every decision** is recorded in a tamper-evident WAL. Verify with `faramesh audit verify`.
- **Every credential** comes from a provider at call time. The agent never holds long-lived secrets.
- **Every deferred action** is visible in the approvals queue with full context.

## Next

- [Stack reference](/stack/): every block in `governance.fms`.
- [FPL language](/fpl/): the grammar with examples.
- [Workflows](/flows/): first apply, change, monitor.
- [CLI](/cli/): every command.
