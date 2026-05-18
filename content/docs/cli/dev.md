---
title: faramesh dev
description: Run governance locally with in-process stubs for Vault, SPIFFE, KMS, and the audit sink — no external infrastructure.
---

`faramesh dev` is the **no-infrastructure mode** of the daemon. It compiles your `governance.fms` exactly like `faramesh apply` does, then runs the daemon against in-process stubs for every provider you haven't declared. You get the full policy engine without Vault, SPIRE, KMS, or a SIEM endpoint.

This is the command you'll use 90% of the time while writing policy or building an agent.

## Usage

```bash title="Terminal"
faramesh dev [--dir DIR]
```

| Flag | Description |
|------|-------------|
| `--dir DIR` | Stack directory. Defaults to the current directory. |

## When to use it

- Run your agent end-to-end while you write the policy.
- Reproduce a deny or defer locally before pushing a policy change.
- Demo Faramesh on a laptop without provisioning anything.
- Run integration tests in CI without a Vault container.

When you're ready for persistent WAL, OS-tier sandbox, and real providers, switch to [`faramesh apply`](/cli/apply/). **Nothing about your agent code or your policy rules changes** — only the provider declarations.

## What happens when you run it

1. `governance.fms` is compiled the same way `apply` compiles it (deterministic AST → `.faramesh/`).
2. The daemon goes through `STARTING → INITIALIZING → READY` and opens its Unix socket.
3. For every provider you **didn't** declare, an in-process stub takes its place.
4. The WAL is in-memory; nothing persists past daemon shutdown.

Every DPR emitted during a dev run is tagged so it's obvious in the chain that stubs were in use. A dev WAL **cannot be confused with a production audit trail** — `faramesh audit verify` flags the dev tag explicitly.

## What the stubs provide

`faramesh dev` starts in-process stubs for every provider type. Each is realistic enough to exercise the full pipeline:

**Secrets stub** — returns a `STUB-<id>` placeholder secret with the TTL declared in policy. The SDK shim sees a real, scoped, time-bounded credential. Replace with a real `provider` block for production.

**Identity stub** — generates an ephemeral SPIFFE id under `spiffe://dev.local/<host>/<pid>`. Your agent gets a real identity string that works with policy conditions and `principal.*` claims. Replace with `identity "spiffe" { ... }` for production.

**KMS stub** — generates an ephemeral Ed25519 keypair per session and signs DPR records. The audit chain is cryptographically intact and verifiable for the lifetime of the run. Replace with `provider "kms" { ... }` for production.

**WAL** — in-memory only. DPR records exist only for the lifetime of the dev session. For persistent audit, use `faramesh apply`.

**Audit sink** — DPRs are pretty-printed to stderr instead of shipped to Splunk/Datadog/S3.

**Cost provider** — uses Faramesh's bundled pricing table for the major model APIs and a flat per-call cost for non-LLM tools.

None of these stubs make network calls. `faramesh dev` works on an airplane.

## Stubs that replace external services

| Missing provider | Local substitute |
|------------------|------------------|
| Credential (Vault, AWS SM, GCP, Azure) | `STUB-<id>` placeholder, dev-tagged in DPR |
| Identity (SPIFFE) | Synthesized SPIFFE id based on hostname/PID |
| KMS (signing) | Local Ed25519 key, chain still verifies |
| Audit sink (Splunk, Datadog, …) | JSON Lines to stderr |
| Cost provider | Bundled pricing table |

You can mix real providers with stubs. Declare `provider "vault" { ... }` in `governance.fms` and Vault runs as a real subprocess while everything else falls back to stubs. This is how most teams iterate: real Vault, stub everything else.

## Output

```text title="Output"
$ faramesh dev
✓ governance.fms valid
✓ governance.fms compiled
✓ in-process providers stubbed: vault (dev server), spiffe (ephemeral CA), kms (ephemeral RSA)
✓ WAL: in-memory
✓ enforcement: application-tier only (OS enforcement not active in dev mode)
→ Unix socket: /Users/you/.faramesh/runtime/faramesh.sock
→ status:    faramesh status
→ approvals: faramesh approvals list
→ start agent: ./.faramesh/bin/agent -- python your_agent.py
```

The daemon stays in the foreground until you hit `Ctrl-C`. To run it in the background, use your shell's `&` or run it under a process supervisor.

## Switching to full enforcement

When you're ready for production:

```bash title="Terminal"
faramesh apply
```

`apply` refuses to launch with stubbed KMS or identity in `runtime { mode = "enforce" }`. Either declare real providers, or run in `mode = "audit"` while you finish provisioning. See [From dev to production](/guides/from-dev-to-prod/) for the full migration.

## Platform support

| Capability | Linux | macOS | Windows |
|------------|-------|-------|---------|
| Policy engine | ✓ | ✓ | ✓ |
| WAL + DPR chain | ✓ | ✓ | ✓ |
| MCP / HTTP proxy | ✓ | ✓ | ✓ |
| OS-tier syscall sandbox | seccomp+Landlock | Seatbelt | — |
| eBPF LSM | Linux 5.7+ | — | — |

`faramesh dev` itself works on all three operating systems. The OS-tier sandbox is not active in dev mode (it's intentionally application-tier only) — turn on `runtime { os_tier = true }` and use [`faramesh apply`](/cli/apply/) when you want it.

## Common issues

| Symptom | Likely cause |
|---------|--------------|
| `socket already in use` | A previous daemon didn't shut down. Run `faramesh apply --stop` or kill the process holding the socket; then remove `~/.faramesh/runtime/faramesh.sock` if needed. |
| `DAEMON_NOT_READY` from the agent | The daemon is still in `INITIALIZING`. Wait one to two seconds and retry. |
| Calls deny with "no rule matched" | `default deny` is firing because no `permit` rule matches your tool name. Check the tool name the SDK is sending in the structured denial payload. |

→ More: [Troubleshooting](/troubleshooting/).

## What's next

- [Quickstart](/quickstart/) — the full five-step walkthrough.
- [`faramesh apply`](/cli/apply/) — production path with real providers.
- [Providers](/providers/) — declare Vault, AWS, GCP, Azure, SPIFFE.
- [Workflows](/flows/) — first apply, change, monitor.
