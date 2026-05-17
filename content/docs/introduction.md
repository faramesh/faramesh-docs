---
title: Why Faramesh
description: What agent governance is for, who it helps, and when to reach for Faramesh before something goes wrong in production.
---

## The 60-second version

You built an AI agent. It can call tools — read mail, move money, open pull requests, talk to your customers. That's the whole point: the model decides which tool to call, with which arguments, when.

Now answer this honestly: **what stops a bad prompt, a confused model step, or a stolen API key from running anything those tools can run?**

If the answer is "we trust the prompt and the model," you don't have governance — you have hope. Faramesh replaces hope with a contract.

You write **one file** (`governance.fms`) that says what your agent is allowed to do. A small daemon runs alongside the agent and **decides every tool call before it executes** — permit, defer to a human, or deny. Each decision is signed and recorded. Long-lived secrets never enter the agent process; credentials are minted at the call site, when policy permits.

That's the whole product. Everything else — the SDKs, the proxies, the registry — is plumbing to put that decision in the right place.

## What problem this actually solves

Agents are software that takes ambiguous natural-language input and turns it into authoritative side effects. The interesting failures are not "the model gave a bad answer" — they're:

- The agent ran a refund. The model thought the user said `$8000`. The user said `$80`.
- The agent emailed a customer's social security number to support@public-domain.com.
- A jailbroken prompt convinced the agent to call `git push --force` against `main`.
- A leaked API key from the agent's environment showed up in someone else's product.
- A junior engineer reverted a guardrail in `governance.fms` and nobody caught it for three weeks.

You can't prevent any of those with a smarter prompt. You prevent them with a **deterministic check at the moment of action**, plus **evidence after the fact**, plus **secrets the agent doesn't hold**. That's what Faramesh does.

## What you get

- **Predictable behavior.** Permit, deny, and defer are explicit. The decision engine is not an LLM. The same input always produces the same decision.
- **Evidence by default.** Every call has a Decision Provenance Record. The chain is hash-linked and (optionally) KMS-signed. Verifiable offline with `faramesh audit verify`.
- **Defense in depth.** SDK shim for native agents, MCP proxy for Claude Code / Cursor, HTTP proxy for hosted runtimes — pick the tier your agent needs.
- **Portable policy.** Versioned imports from the [public catalog](https://github.com/faramesh/faramesh-registry) (providers, policy packs, framework profiles). Pin them. Audit them. Mirror them.
- **Optional OS sandbox.** On Linux (seccomp + Landlock) and macOS (Seatbelt), `runtime { os_tier = true }` adds syscall-level enforcement so even a malicious tool can't bypass the daemon.

## The story in one scene

A payment agent tries to refund $8,000. Your policy says anything over $500 needs a human:

```hcl title="governance.fms"
agent "support-bot" {
  rules {
    permit stripe/refund if amount < $500
    defer  stripe/refund if amount >= $500
    deny   stripe/payouts
  }
}
```

What happens, in order:

1. The model decides to call `stripe/refund` with `{amount: 8000}`.
2. The Faramesh SDK shim intercepts the call, sends it to the local daemon.
3. The daemon evaluates the rule: `amount < $500` is false. `amount >= $500` matches. **Effect: defer.**
4. The agent receives a `ToolDeniedException` with a defer token. The refund does **not** happen.
5. A notification fires on `#payments-approvals` (because of an `alert` block).
6. An operator runs `faramesh approvals approve <token>` or clicks Approve in the UI.
7. The agent retries; the daemon now permits the call **once**, mints a Stripe key with a 30-second TTL, runs the refund, and writes a signed record naming the operator who approved it.

That loop — **declare → enforce → record → review** — is the whole product.

## Who this is for

| Role | Start here |
|------|------------|
| **Agent developer** building tools | [Quickstart](/quickstart/) → [Govern a LangGraph agent](/guides/govern-a-langgraph-agent/) |
| **Security / GRC** asking for evidence | [Auditing agent decisions](/guides/security-engineer/) |
| **Platform / SRE** running it for many teams | [Deploying at scale](/guides/platform-engineer/) |
| **Evaluating tools** | [How Faramesh compares](/compare/alternatives/) |

## What Faramesh is not

To save you time:

- **Not a model gateway.** It doesn't proxy LLM completions. Use a model gateway for that and put Faramesh on the tool side.
- **Not a prompt firewall.** Prompt-injection defense is one input to a policy; it isn't the policy itself.
- **Not a SaaS lock-in.** The daemon and SDK are open-source. [Faramesh Cloud](/cloud/) is optional fleet visibility — it never sits in the enforcement path.
- **Not a heavyweight install.** `faramesh dev` boots in-process stubs for Vault, SPIFFE, KMS, and the audit sink. You can run the whole thing on a laptop on an airplane.

## Next steps

- New here? Read [Quickstart](/quickstart/) — five minutes, no infra required.
- Want the mental model first? Read [How Faramesh works](/concepts/how-it-works/).
- Designing a deployment? Read [Architecture](/concepts/architecture/) and [Topologies](/concepts/topologies/).
- Ready for examples? Try the [LangGraph tutorial](/guides/govern-a-langgraph-agent/) or [Write your first policy](/guides/your-first-policy/).
