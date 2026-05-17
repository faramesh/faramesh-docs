---
title: What does Faramesh guarantee?
---

## The agent cannot modify policy

**Threat:** Agent edits `governance.fms` to permit dangerous tools.  
**Mitigation:** Config loads once at `apply`; the daemon does not watch the file.  
**Limitation:** A privileged user on the host can still edit the file before the next `apply`.

## The agent cannot kill the daemon

**Threat:** Agent sends signals to the governance process.  
**Mitigation:** Seccomp baseline denies kill/ptrace syscalls; optional eBPF LSM on Linux 5.7+.  
**Limitation:** Requires Linux for seccomp and eBPF LSM.

## The agent never holds credentials

**Threat:** Secrets appear in agent memory or logs.  
**Mitigation:** Provider `GetSecret` returns short-lived scoped credentials at execution time.  
**Limitation:** Misconfigured providers can still leak via logs.

## Every decision is tamper-evident

**Threat:** Operator denies an action occurred.  
**Mitigation:** DPR hash chain in the WAL; KMS signing in production.  
**Limitation:** KMS required for production-grade non-repudiation.

Next: [Errors](/errors/).
