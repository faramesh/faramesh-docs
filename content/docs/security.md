---
title: Security model
description: Threats Faramesh defends against, the mitigations it ships, and explicit limits.
---

Faramesh exists because giving an LLM access to real tools is dangerous unless those tools are gated by something the LLM can't manipulate. This page is the threat model, what Faramesh guarantees, how, and where the limits are.

## Trust boundary

```text title="Output"
┌─────────────────────────┐
│        Agent runtime     │  ← untrusted (LLM + tool code)
└────────────┬─────────────┘
             │  every tool call
┌────────────▼─────────────┐
│      Faramesh daemon     │  ← trusted boundary
│   policy engine + WAL    │
└────────────┬─────────────┘
             │
   ┌─────────▼─────────┐  ┌───────────────┐  ┌────────────┐
   │ Credential providers │ │ Identity / KMS │  │ Audit sink │
   └──────────────────┘  └───────────────┘  └────────────┘
```

The agent runtime is treated as untrusted code. Everything below the dashed line is the trust boundary Faramesh enforces.

## Guarantees

### The agent cannot modify policy

**Threat.** A compromised agent edits `governance.fms` to permit dangerous tools.

**Mitigation.** Policy is compiled once at `faramesh apply` into `.faramesh/`. The daemon does not re-read the source file. Tampered state files fail signature verification on reload.

**Limit.** A privileged user with shell access can still edit `governance.fms` and run `apply`. Treat the host as a privileged-access boundary.

### The agent cannot kill the daemon

**Threat.** A compromised agent sends signals to the governance process so it can run unchecked.

**Mitigation.** A seccomp baseline denies `kill`, `tkill`, `ptrace`, and related syscalls in the agent's process tree. On Linux 5.7+, an optional eBPF LSM enforces the same at the kernel level.

**Limit.** Requires Linux for syscall-level enforcement. On macOS/Windows the daemon process is protected only by ordinary OS permissions; combine with `enforcement { os_tier = true }` on Linux for hostile-agent setups.

### The agent never holds long-lived credentials

**Threat.** Secrets leak into agent memory, prompts, or logs.

**Mitigation.** Credentials are minted on demand by providers (Vault, AWS SM, GCP, Azure, SPIFFE) at the moment a tool executes. The token is scoped to the action and is short-lived. The agent process never sees the secret directly. Faramesh injects it into the call site.

**Limit.** A misconfigured provider can still return long-lived credentials. Use the recommended scoped-role configurations in the [providers reference](/providers/).

### Every decision is tamper-evident

**Threat.** An operator or attacker denies a decision occurred.

**Mitigation.** Every decision becomes a Decision Provenance Record (DPR). DPRs are written to a hash-chained WAL and optionally signed by an external KMS so chain forgery requires KMS access, not just daemon access. `faramesh audit verify` walks the chain end-to-end.

**Limit.** Production-grade non-repudiation requires an external KMS. Without one, signing happens with a local key and an attacker with root can re-sign forged segments.

### The agent cannot exfiltrate to arbitrary hosts

**Threat.** Tool code is patched to upload data to an attacker-controlled host.

**Mitigation.** The `egress` block enforces an allow/deny list at the HTTP proxy tier. On Linux, OS-tier enforcement adds a syscall-level network sandbox.

**Limit.** SDK-tier shim enforcement can be bypassed from inside the agent process. Combine with OS-tier on Linux for hostile setups.

### Async tasks can't slip through

**Threat.** A tool defers work to an async worker that completes after the agent moves on, skipping policy.

**Mitigation.** The MCP proxy implements `faramesh/tasks/complete`. The daemon tracks every deferred task and refuses agent task completion (`COMPLETION_BLOCKED`) until all open work has resolved.

**Limit.** Upstream MCP servers must implement the extension. Faramesh logs a `RUNTIME_GAP` decision if a tool reports an async task without committing to completion.

### Config load-once (no hot edit bypass)

**Threat.** A compromised agent edits `governance.fms` or `.fpl` on disk and expects the daemon to pick up permissive rules.

**Mitigation.**

1. **`faramesh apply`** compiles policy into `.faramesh/governance.compiled.json` and materialized `governance.policy.fpl`. The daemon started with `--from-compiled` does **not** hot-reload source files on SIGHUP (load-once default).
2. **`runtime { immutable_config = true }`** — after apply, the CLI sets the Linux immutable flag (`chattr +i`) or macOS `uchg` on the config source so even root must explicitly unlock before editing.
3. **Privileged apply only** — policy changes require `faramesh apply` as a user that can restart the daemon, not the agent UID.

### Daemon lifecycle and `DAEMON_NOT_READY`

The daemon moves **STARTING → INITIALIZING → READY → DRAINING → HALT**. While state is not `READY` (WAL replay, policy compile, listeners wiring), every govern RPC returns structured denial **`DAEMON_NOT_READY`**. The Unix socket is opened only after `READY`, so clients never observe a half-initialized engine.

Optional `runtime { cold_start_deny_window = "30s" }` transitions to **HALT** if initialization exceeds the window (fail-closed).

### UID separation and process isolation

| Component | Recommended UID | Owns |
|-----------|-------------------|------|
| `faramesh serve` (daemon) | `faramesh` | `.faramesh/`, socket, WAL, compiled policy |
| Agent / IDE / CI job | `agent` (unprivileged) | project workspace only |
| `faramesh apply` | root or `faramesh` + sudo | restart daemon, immutable flags |

`kill()` requires same UID or capability; an agent running as `agent` cannot signal the daemon running as `faramesh`. Pair with **systemd** `Restart=always` on the daemon unit so a successful kill only causes a brief governance gap.

### Seccomp and eBPF for hostile agents

On Linux, the agent seccomp profile **denies** `kill`, `tkill`, and `tgkill` against foreign PIDs. Landlock and optional **eBPF LSM** enforce the same baseline at kernel level. Enable **`runtime { os_tier = true }`** in `governance.fms`, then start the agent with **`.faramesh/bin/agent`** (written by `faramesh apply`) — no separate CLI command.

## Defense in depth

| Layer | What it does | When to enable |
|-------|--------------|----------------|
| Policy engine | Allow / defer / deny per call. | Always. |
| Credential broker | Short-lived scoped tokens at call time. | Production. |
| MCP / HTTP proxy | Faramesh sees the wire-level call. | Off-the-shelf clients. |
| OS-tier syscalls | seccomp / Landlock baseline. | Linux production for untrusted agents. |
| eBPF LSM | Kernel-level enforcement of the same baseline. | Linux 5.7+. |
| KMS signing | Audit chain non-repudiation. | Production. |
| Audit sink | Stream decisions to SIEM. | Compliance. |

## Recommended posture per environment

| Environment | Mode | Providers | OS-tier | KMS |
|-------------|------|-----------|---------|-----|
| Local | `audit` or `enforce` | stubs | off | local key |
| Staging | `enforce` | real | on (Linux) | local key |
| Production | `enforce` | real | on (Linux) | external KMS |
| Air-gapped | `enforce` | local | on | local HSM |

## What's next

- [Enforcement](/concepts/enforcement/): the decision pipeline in depth
- [Auditing](/concepts/auditing/). DPR, WAL, chain verification
- [Credentials](/concepts/credentials/): the broker and how secrets stay out of the agent
- [Limitations](/limitations/): explicit non-goals
- [Denial codes](/errors/): what agents receive on policy failures
