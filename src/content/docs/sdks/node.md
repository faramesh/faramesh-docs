---
title: Node SDK
description: governedTools, ToolDeniedError, and transport configuration for Faramesh's TypeScript / Node.js SDK.
---

The Node SDK wraps tool collections from Mastra, the Vercel AI SDK, and any TypeScript framework that exposes a tool registry. Every tool invocation flows through the daemon before execution.

## Install

```bash
npm install @faramesh/sdk
# or
pnpm add @faramesh/sdk
```

Requires Node 18+. ESM-first, with a CommonJS build for legacy projects.

## `governedTools`

```ts
import { governedTools } from "@faramesh/sdk";
import { searchDocs, sendEmail, chargeCard } from "./tools";

export const tools = governedTools(
  { searchDocs, sendEmail, chargeCard },
  { agentId: "payments-bot" },
);
```

The wrapper accepts:

- A Vercel AI SDK `ToolSet` (object form) — most common
- An array of tools that follow the AI SDK `tool({ ... })` shape
- A Mastra `Agent`'s `tools` registry
- Plain async functions, treated as tools named after the property key

It returns a registry of the same shape, so consumers don't change.

## Configuration

```ts
governedTools(toolSet, {
  agentId: "payments-bot",
  transport: undefined,            // auto-selected
  onDefer: "throw",                // "throw" | "block" | callback
  onDeny: "throw",
  timeoutMs: 10_000,
  failOpen: false,                 // never true in production
});
```

| Option | Description |
|--------|-------------|
| `agentId` | Required. Matches `agent "<id>"` in `governance.fms`. |
| `onDefer` | `throw` raises `ToolDeniedError`. `block` polls until approval/timeout. Callback signature: `(denial, approvalId) => Promise<Decision>`. |
| `onDeny` | Same shape; `block` not allowed. |
| `timeoutMs` | Cap on daemon round-trip. |
| `failOpen` | Permits when daemon is unreachable. Always `false` in production stacks. |

## `ToolDeniedError`

```ts
import { ToolDeniedError } from "@faramesh/sdk";

try {
  const result = await tool({ args });
} catch (err) {
  if (err instanceof ToolDeniedError) {
    err.code;             // "POLICY_DENY", "POLICY_DEFER", ...
    err.humanMessage;
    err.ruleRef;
    err.resolution;       // typed union, see /errors/
    err.approvalId;
    err.actionId;
  }
}
```

`err.resolution` is a discriminated union; TypeScript narrows on the `type` field:

```ts
switch (err.resolution.type) {
  case "pending_approval":
    return queueForReview(err.resolution.approvalId);
  case "retry_after":
    await sleep(err.resolution.retryAfterSeconds * 1000);
    return retry();
  case "budget_reset":
    return notify(`budget exhausted, resets at ${err.resolution.resetsAt}`);
  case "rule_block":
    return reject(`blocked by ${err.resolution.ruleId}`);
}
```

## Streaming and the AI SDK

The wrapped tools are drop-in compatible with `streamText` and `generateText`:

```ts
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

const result = await streamText({
  model: openai("gpt-4o"),
  tools,
  messages,
});
```

A denial during a streaming generation is surfaced as a tool result with the structured denial payload — your model loop sees a "tool call rejected" outcome it can react to (apologize, fall back, ask the user).

## Mastra integration

```ts
import { Agent } from "@mastra/core";
import { governedTools } from "@faramesh/sdk";

const agent = new Agent({
  name: "ops",
  instructions: "...",
  tools: governedTools(rawTools, { agentId: "ops-agent" }),
});
```

Mastra workflows pass a session id along with tool calls; the SDK forwards it as the daemon's session correlation key automatically.

## Transport selection

Same priority order as the Python SDK:

| Order | Variable | Mechanism |
|-------|----------|-----------|
| 1 | `FARAMESH_REMOTE_URL` | HTTPS to a remote daemon. Use for Vercel, Cloudflare Workers, or any serverless runtime. |
| 2 | `FARAMESH_SOCKET` | Unix socket. Default for local stacks. |
| 3 | `FARAMESH_BASE_URL` | HTTPS to a local daemon listening on a port. |

You can construct a transport explicitly:

```ts
import { governedTools, HttpTransport } from "@faramesh/sdk";

const tools = governedTools(toolSet, {
  agentId: "payments-bot",
  transport: new HttpTransport("https://eval.internal", { token: process.env.FARAMESH_TOKEN }),
});
```

For Workers / Edge: pass the `fetch` from your runtime — the SDK does not import `node:` modules in the HTTP path.

```ts
new HttpTransport("https://eval.internal", { fetch: globalThis.fetch });
```

## Forwarded metadata

The SDK propagates a known set of fields to the daemon as condition variables:

| Field | Becomes |
|-------|---------|
| `principal` | `principal.*` claims (JWT or structured) |
| `sessionId` | Session correlation key |
| `requestId` | Correlation id surfaced in DPR |
| `tags` | Free-form tag list usable in conditions |

Anything else is dropped at the wrapper boundary.

## Testing

```ts
import { governedTools, StubTransport } from "@faramesh/sdk";

const tools = governedTools(toolSet, {
  agentId: "my-agent",
  transport: new StubTransport({
    sendEmail: "permit",
    chargeCard: { effect: "deny", code: "POLICY_DENY", humanMessage: "test" },
  }),
});
```

Use this in your unit / integration tests to assert your agent handles denials and defers without reaching for the daemon.

## What's next

- [Mastra](/frameworks/mastra/) — full wiring example
- [Vercel AI SDK](/frameworks/vercel-ai-sdk/)
- [Denial codes](/errors/) — every payload the SDK can throw
