# Faramesh Documentation

Deep-dive docs for [Faramesh Core](https://github.com/faramesh/faramesh-core) — the open-source execution gatekeeper for AI agents.

For the hosted version, see [faramesh.dev](https://faramesh.dev).

## Contents

### Getting started
| File | What's in it |
|---|---|
| [Quickstart.md](guides/Quickstart.md) | Install, run, first action |
| [INTEGRATIONS.md](guides/INTEGRATIONS.md) | LangChain, CrewAI, AutoGen, MCP, LangGraph, LlamaIndex |
| [govern-your-own-tool.md](guides/govern-your-own-tool.md) | Wrap any custom tool |
| [LangChain integration.md](guides/LangChain%20integration.md) | LangChain deep-dive |
| [HOT_RELOAD.md](guides/HOT_RELOAD.md) | Hot-reload policies without restart |
| [EXTENDING.md](guides/EXTENDING.md) | Extending Faramesh |

### Reference
| File | What's in it |
|---|---|
| [API.md](reference/API.md) | Full HTTP API reference |
| [CLI.md](reference/CLI.md) | All CLI commands |
| [EXECUTION-GATE.md](reference/EXECUTION-GATE.md) | How the gate works, deterministic hashing, audit chain |
| [Policies.md](reference/Policies.md) | Policy syntax, rules, first-match-wins |
| [POLICY_PACKS.md](reference/POLICY_PACKS.md) | Ready-to-use policy templates |

### SDKs
| File | What's in it |
|---|---|
| [SDK-Python.md](sdk/SDK-Python.md) | Python SDK (`faramesh-sdk`) |
| [SDK-Node.md](sdk/SDK-Node.md) | Node.js SDK (`@faramesh/sdk`) |

### Platform & Operations
| File | What's in it |
|---|---|
| [Docker.md](platform/Docker.md) | Docker Compose setup |
| [OBSERVABILITY.md](platform/OBSERVABILITY.md) | Prometheus metrics, monitoring |
| [UI.md](platform/UI.md) | Dashboard and web UI |

### Security & Troubleshooting
| File | What's in it |
|---|---|
| [SECURITY-GUARDRAILS.md](security/SECURITY-GUARDRAILS.md) | Security model |
| [ERROR-HANDLING.md](security/ERROR-HANDLING.md) | Error types and handling |
| [Troubleshooting.md](community/Troubleshooting.md) | Common issues |

## Related repos

| Repo | Purpose |
|---|---|
| [faramesh-core](https://github.com/faramesh/faramesh-core) | The server + policy engine |
| [faramesh-examples](https://github.com/faramesh/faramesh-examples) | Runnable examples |
| [faramesh-python-sdk](https://github.com/faramesh/faramesh-python-sdk) | Python SDK |
| [faramesh-node-sdk](https://github.com/faramesh/faramesh-node-sdk) | Node.js SDK |
