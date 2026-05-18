---
title: Contributing to Faramesh
description: How to clone the repos, find the right code, and open a pull request — across core, docs, SDKs, and the registry.
---

This guide is for **anyone who wants to contribute to Faramesh** — open a PR, fix a bug, add a framework profile, improve a docs page. You don't need any special access. Everything is on GitHub, MIT-licensed, and reviewed in the open.

If you're a maintainer and need release / signing-key procedures, those live inside each repo's `MAINTAINERS.md` and aren't part of these docs.

## Repository map

Faramesh is split across a few public GitHub repositories under the [faramesh](https://github.com/faramesh) org:

| Repository | What lives here | Primary language |
|------------|------------------|------------------|
| [faramesh-core](https://github.com/faramesh/faramesh-core) | CLI, daemon, policy engine, proxies, sandbox | Go |
| [faramesh-docs](https://github.com/faramesh/faramesh-docs) | docs.faramesh.dev (this site) | TypeScript / MDX |
| [faramesh-registry](https://github.com/faramesh/faramesh-registry) | Public catalog (providers, policy packs, framework profiles) | FPL + JSON |
| [faramesh-python-sdk](https://github.com/faramesh/faramesh-python-sdk) | PyPI `faramesh-sdk` | Python |
| [faramesh-typescript-sdk](https://github.com/faramesh/faramesh-typescript-sdk) | npm `@faramesh/sdk` | TypeScript |

Each repo has its own CI and release cadence; you typically only need to clone the one(s) you're changing.

## Where things live (faramesh-core)

```text
faramesh-core/
├── cmd/faramesh/        CLI entry points (init, dev, check, plan, apply, serve, …)
├── internal/
│   ├── daemon/          Daemon lifecycle, WAL replay, socket server
│   ├── core/            Pipeline, policy engine, denial codes, sandbox
│   ├── adapter/         SDK socket, MCP/HTTP proxy, gRPC gateway
│   └── runtimeagent/    .faramesh/bin/agent generation
├── tests/               End-to-end shell scripts (e.g. e2e_zero_governed.sh)
└── packs/               Built-in policy fragments
```

**Common change shapes:**

- Add or fix a CLI flag → `cmd/faramesh/<command>.go`
- Add a new denial code → `internal/core/reasons/`
- Add a provider type → `internal/provider/` plus an entry in `faramesh-registry`
- Fix a pipeline bug → `internal/core/pipeline.go` (the most edited file)

## Where things live (faramesh-docs)

```text
faramesh-docs/
├── content/docs/        MDX pages (sidebar order in meta.json)
├── components/          Reusable React/MDX components
├── lib/                 Source loader, metadata, shared helpers
└── app/                 Next.js routes (Fumadocs)
```

Doc-only changes don't require a core release. Build locally with `npm run build`.

## Setting up your environment

```bash title="Terminal"
# Clone what you need
git clone https://github.com/faramesh/faramesh-core
git clone https://github.com/faramesh/faramesh-docs

# Core: Go 1.22+
cd faramesh-core
go build ./...
go test ./...

# Docs: Node 20+
cd ../faramesh-docs
npm install
npm run dev   # local preview at localhost:3000
```

That's the whole setup. No secrets, no credentials, no hosted services required.

## Opening a PR

The flow we expect from contributors:

1. **Fork** the repo on GitHub.
2. **Branch** with a descriptive name (`feat/cli-rollback-flag`, `fix/seccomp-mac-syscall`, `docs/explain-defer-flow`).
3. **Code + tests.** For core, `go test ./...` must pass; for SDKs, the package's own test suite. For docs, `npm run build` must succeed.
4. **Open a PR** describing the change, the motivation, and how to verify it. Link any related issue.
5. A maintainer reviews. Smaller, focused PRs land faster than big ones.

We don't require CLAs or DCO sign-offs. We do require that your changes work, have tests where reasonable, and explain themselves.

## Running the end-to-end tests

`faramesh-core` ships shell-level E2E tests that exercise the full daemon + SDK + CLI path:

```bash title="Terminal"
cd faramesh-core
go build -o faramesh ./cmd/faramesh
bash tests/e2e_zero_governed.sh
bash tests/e2e_completion_gate.sh
```

These pass on macOS and Linux. They use only the local stub providers — no infra required.

## Cross-repo features

Some features touch more than one repo. The conventional order is:

1. **core** (the engine) — change behavior, add tests.
2. **SDKs** — adopt the new core protocol or denial code.
3. **registry** — publish any new framework profile / policy pack / provider.
4. **docs** — explain the new feature.

Reference sibling PR URLs in each PR description so reviewers can follow the dependency chain. Don't merge a docs change that describes a CLI flag that doesn't exist yet.

## Code style

- **Go**: standard `gofmt`, golangci-lint clean. We aim for short, descriptive names; we don't worship interfaces.
- **TypeScript**: ESM, `strict: true`. Prefer named exports.
- **MDX**: keep front matter (`title`, `description`) on every page. Use code blocks with `title="…"` for filenames.
- **Comments**: explain *why*, not *what*. The diff already shows what changed.

## Filing an issue

Good bug reports get fixed faster:

```text title="What helps"
- OS, architecture, faramesh --version
- Minimal governance.fms reproducing the issue
- Exact command(s) you ran
- Full output (use a code block, not a screenshot)
- What you expected, what happened
```

For features, describe the use case before the proposed solution. We're more likely to ship a feature that solves a real problem than one that fits a clean abstraction.

## Things we'll likely say no to (for now)

- New top-level CLI commands that duplicate existing flags. We intentionally keep the surface small.
- Provider integrations that aren't part of the public catalog (open a PR against `faramesh-registry` instead).
- Breaking changes to the SDK socket protocol without a migration story.

## Related

- [Architecture](/concepts/architecture/) — useful before changing daemon code.
- [FPL reference](/fpl/) — useful before changing parser code.
- [Denial codes](/errors/) — useful before adding new denial paths.
- [CLI reference](/cli/) — useful before changing user-visible CLI behavior.
