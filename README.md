# Faramesh Documentation

Deep-dive docs for [Faramesh Core](https://github.com/faramesh/faramesh-core) — the open-source execution gatekeeper for AI agents.

For the hosted version, see [faramesh.dev](https://faramesh.dev).

## Contents

### Getting started
| File | What's in it |
|---|---|
| [Quickstart.md](Quickstart.md) | Install, run, first action |
| [API.md](API.md) | Full HTTP API reference |
| [CLI.md](CLI.md) | All CLI commands |

### Core concepts
| File | What's in it |
|---|---|
| [EXECUTION-GATE.md](EXECUTION-GATE.md) | How the gate works, deterministic hashing, audit chain |
| [Policies.md](Policies.md) | Policy syntax, rules, first-match-wins |
| [POLICY_PACKS.md](POLICY_PACKS.md) | Ready-to-use policy templates |

### Framework integrations
| File | What's in it |
|---|---|
| [INTEGRATIONS.md](INTEGRATIONS.md) | LangChain, CrewAI, AutoGen, MCP, LangGraph, LlamaIndex |
| [govern-your-own-tool.md](govern-your-own-tool.md) | Wrap any custom tool |

### SDKs
| File | What's in it |
|---|---|
| [SDK-Python.md](SDK-Python.md) | Python SDK (`faramesh-sdk`) |
| [SDK-Node.md](SDK-Node.md) | Node.js SDK (`@faramesh/sdk`) |

### Operations
| File | What's in it |
|---|---|
| [Docker.md](Docker.md) | Docker Compose setup |
| [HOT_RELOAD.md](HOT_RELOAD.md) | Hot-reload policies without restart |
| [OBSERVABILITY.md](OBSERVABILITY.md) | Prometheus metrics, monitoring |
| [ERROR-HANDLING.md](ERROR-HANDLING.md) | Error types and handling |
| [Troubleshooting.md](Troubleshooting.md) | Common issues |
| [SECURITY-GUARDRAILS.md](SECURITY-GUARDRAILS.md) | Security model |
| [EXTENDING.md](EXTENDING.md) | Extending Faramesh |

## Related repos

| Repo | Purpose |
|---|---|
| [faramesh-core](https://github.com/faramesh/faramesh-core) | The server + policy engine |
| [faramesh-examples](https://github.com/faramesh/faramesh-examples) | Runnable examples |
| [faramesh-python-sdk](https://github.com/faramesh/faramesh-python-sdk) | Python SDK |
| [faramesh-node-sdk](https://github.com/faramesh/faramesh-node-sdk) | Node.js SDK |
