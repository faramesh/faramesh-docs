---
title: Run Faramesh locally
description: Run governance on your laptop with no external secret store, KMS, or SIEM.
---

`faramesh dev` is the **no-infrastructure mode** of the daemon. It compiles your `governance.fms` exactly like `faramesh apply` does, then runs the daemon against in-process stubs for everything you haven't declared. You get the full policy engine without Vault, SPIRE, KMS, or a SIEM endpoint.

```bash title="Terminal"
faramesh dev [--dir DIR]
```

Use it to:

- Run your agent end-to-end while you write the policy.
- Reproduce a deny / defer locally before pushing changes.
- Demo Faramesh on a laptop without spinning up infra.

## What happens

1. `governance.fms` is compiled the same way `apply` compiles it.
2. The daemon starts on a local Unix socket and HTTP listener.
3. For every provider you **didn't** declare, an in-process stub takes its place.
4. The WAL writes to an ephemeral SQLite file under `.faramesh/dev/`.

Every DPR emitted during a local run is tagged so it's obvious in the chain that stubs were in use, it cannot be confused with a production audit trail.

## What the stubs provide

`faramesh dev` starts in-process stubs for every provider type:

**Secrets stub** — returns a random credential value with the declared TTL. Use this while developing. Replace with a real `provider` block for production.

**Identity stub** — generates an ephemeral workload SPIFFE ID under `spiffe://dev.local/`. Your agent gets a real identity string that works with policy and preflight. Replace with `identity "spiffe" { ... }` for production.

**KMS stub** — generates an ephemeral RSA keypair and signs DPR records with RSASSA-PSS (SHA-256). The audit chain is cryptographically intact. Replace with a real KMS provider for production.

**WAL** — in-memory only. DPR records exist only for the lifetime of the dev session. For persistent audit trails, use `faramesh apply`.

None of these stubs make network calls. `faramesh dev` works on an airplane.

Run `faramesh apply` instead of `faramesh dev` when you are ready for persistent WAL and OS-tier enforcement on Linux. Nothing else changes: same `governance.fms`, same agent code, same policy rules — only the provider declarations change.

## Stubs that replace external services

| Missing provider | Local substitute |
|------------------|------------------|
| Credential (Vault, AWS SM, GCP, Azure) | Returns a `STUB-<id>` placeholder secret tagged for development. |
| Identity (SPIFFE) | Synthesizes a deterministic SPIFFE id based on your hostname. |
| KMS (signing) | Generates a local ed25519 key and signs DPRs with it. The chain still verifies. |
| Audit sink (Splunk, Datadog, etc.) | Pretty-prints JSON Lines to stderr. |
| Cost provider | Uses the bundled pricing table. |

You can mix real providers with stubs. Declare a `provider "vault" { ... }` in `governance.fms` and the Vault provider runs as a real subprocess while everything else falls back to stubs.

## Switching to full enforcement

When you're ready, swap `dev` for `apply`, no policy changes required:

```bash title="Terminal"
faramesh apply
```

`apply` refuses to launch with stubbed-out KMS or identity in `runtime { mode = "enforce" }`. Declare real providers, or run in `mode = "audit"` while you finish provisioning.

## Platform support

| Capability | Linux | macOS | Windows |
|------------|-------|-------|---------|
| Policy engine | ✓ | ✓ | ✓ |
| WAL + DPR chain | ✓ | ✓ | ✓ |
| MCP / HTTP proxy | ✓ | ✓ | ✓ |
| Seccomp / Landlock OS-tier | ✓ |, |, |
| eBPF LSM | Linux 5.7+ |, |, |

`faramesh dev` works fully on all three operating systems. OS-tier syscall enforcement is Linux-only and is not part of the local stub set.

## What's next

- [Quickstart](/quickstart/): five-step walkthrough
- [Providers](/providers/): declare real backends when you're ready
- [Workflows](/flows/): first apply, change, monitor
