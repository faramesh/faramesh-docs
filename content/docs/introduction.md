---
title: Why Faramesh
description: What agent governance is for, who it helps, and when to reach for Faramesh before something goes wrong in production.
---

You deployed an agent that can call tools. It can read mail, move money, open pull requests, and talk to your customers. One bad prompt, one confused model step, or one stolen API key—and the blast radius is your production account, not a typo in a unit test.

Faramesh exists so **every tool call is decided before it runs**. You declare what should be allowed in one place (`governance.fms`). A local daemon enforces that policy on each invocation, writes a tamper-evident record of the decision, and can pause for human approval when the stakes are high. The agent never holds long-lived secrets; credentials are brokered at the call site when policy permits.

## What you get

- **Predictable behavior** — permit, deny, and defer are explicit. No “hope the model behaves.”
- **Evidence by default** — decision provenance you can verify offline (`faramesh audit verify`).
- **Defense in depth** — SDK shim, MCP proxy, or HTTP proxy depending on how the agent is built.
- **Portable policy** — versioned imports from the [public GitHub catalog](https://github.com/faramesh/faramesh-registry) (providers, policy packs, framework profiles).

## Who this is for

| Role | Start here |
|------|------------|
| Agent developer | [Quickstart](/quickstart/) → [Framework guides](/frameworks/) |
| Security / GRC | [Auditing agent decisions](/guides/security-engineer/) |
| Platform / SRE | [Deploying at scale](/guides/platform-engineer/) |
| Evaluating tools | [How Faramesh compares](/compare/alternatives/) |

## The story in one scene

A payment agent tries to refund $8,000. Policy defers anything over $500 to `#payments`. The daemon blocks execution, notifies the channel, and waits. An operator approves in the approvals UI or CLI. The refund runs once, with a signed record of who approved it and which rule fired.

That is the loop Faramesh is built around: **declare → enforce → record → review**.

## Next steps

When you are ready for commands and config, go to [Quickstart](/quickstart/). For the mental model of the daemon and policy pipeline, read [How Faramesh works](/concepts/how-it-works/) and [Architecture](/concepts/architecture/).
