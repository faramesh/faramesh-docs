---
title: What are Faramesh limitations?
---

- Linux is required for full OS enforcement (seccomp, Landlock, eBPF). macOS and Windows support network-proxy governance only.
- Production DPR signing requires KMS outside the daemon process.
- Firecracker isolation adds roughly 125ms cold start when enabled.
- Async MCP Task completion uses the `faramesh/tasks/complete` JSON-RPC extension; the upstream MCP server must call it when a task finishes.
- Streaming tool responses are not governed in v2.0.
- Multi-tenancy is not supported in v2.0.
- Cross-agent budget pooling is not supported in v2.0.
- Remote mode adds roughly 10–30ms HTTPS latency per evaluation.
- Application-tier SDK shims can be bypassed from inside the agent process; Linux OS-tier enforcement is the backstop.
