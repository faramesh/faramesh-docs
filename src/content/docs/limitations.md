---
title: Limitations
description: Things Faramesh v2.0 explicitly does not do, so you can plan around them.
---

Faramesh is opinionated about what it ships. The list below is the set of things v2.0 deliberately doesn't claim — knowing them helps you plan deployments and avoid surprises.

## Platform

- **Linux is required for OS-tier enforcement.** Seccomp, Landlock, and eBPF LSM are Linux-only. macOS and Windows hosts run policy, MCP proxy, and HTTP proxy enforcement only.
- **Firecracker isolation adds latency.** ~125 ms cold-start when `enforcement { isolation = "firecracker" }` is enabled.

## Cryptography

- **Production DPR signing requires an external KMS.** Without it, decision-record signing happens with a local ed25519 key. The chain is still verifiable, but a host attacker with root can re-sign forged segments. Wire AWS KMS, GCP KMS, or HashiCorp Vault Transit for non-repudiation.

## Tooling protocols

- **Streaming tool responses aren't governed in v2.0.** A tool that streams chunks back through the SDK has its first response evaluated; subsequent chunks pass through.
- **Async MCP task completion needs upstream cooperation.** The proxy implements `faramesh/tasks/complete`. Upstream MCP servers that don't call it leave deferred tasks pending forever; the daemon emits a `RUNTIME_GAP` audit record.

## Operational

- **No multi-tenancy in v2.0.** One stack, one tenant. Run a daemon per tenant if you need isolation.
- **No cross-agent budget pooling in v2.0.** Each agent's budget is independent.
- **Remote evaluation adds 10–30 ms.** Using `FARAMESH_REMOTE_URL` puts an HTTPS hop on every call. For latency-sensitive paths, run the daemon locally.

## Threat model

- **SDK-tier shim enforcement is bypassable from inside the agent process.** A malicious tool can avoid the wrapper by calling its underlying client directly. For untrusted agents, combine with Linux OS-tier enforcement (`enforcement { os_tier = true }`) or use the MCP / HTTP proxy tier so the wire-level call is gated outside the process.
- **`governance.fms` editing is a privileged-host operation.** Anyone with shell access can edit the file and re-apply. Treat the host as a privileged boundary; use signed policy packs and trust-root pinning to constrain what the host can legitimately apply.

## Roadmap (not in v2.0)

The items above are limits of v2.0 specifically. The following are deliberate post-v2.0 work:

- Streaming response governance
- Multi-tenant daemon mode
- Cross-agent budget pooling
- Native Windows OS-tier enforcement
- Per-rule canary rollout

## What's next

- [Security model](/security/) — what Faramesh does protect against
- [Stack reference](/stack/) — what you can configure now
- [Denial codes](/errors/)
