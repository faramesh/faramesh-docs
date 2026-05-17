---
title: Troubleshooting
description: Common CLI, daemon, registry, and SDK failures and fixes.
---

## `faramesh check` fails on imports

| Symptom | Fix |
|---------|-----|
| Registry unreachable | Retry with network; use `faramesh check --offline` only if artifacts are cached under `.faramesh/` |
| Unknown trust key | Add the Ed25519 key from [catalog/trust/keys.json](https://github.com/faramesh/faramesh-registry/blob/main/catalog/trust/keys.json) to `trust { }` in `governance.fms` |
| Pin rejected | Use exact semver (`@1.0.0`), not `@latest` |

## `faramesh dev` / `apply` — daemon not reachable

| Symptom | Fix |
|---------|-----|
| `connection refused` on socket | Run `faramesh status`; ensure `FARAMESH_SOCKET` matches output |
| `DAEMON_NOT_READY` | Daemon still initializing; wait for WAL replay. If persistent, check `.faramesh/daemon.log` |
| Stale PID file | `faramesh destroy` then `faramesh dev` or `apply` |

## SDK: `ToolDeniedException` / structured denial

See [Denial codes](/errors/). For deferrals, run `faramesh approvals approve <id>`. Ensure `GovernedToolSet` uses the **tool name** FPL expects (e.g. `send_email`, not `send_email/invoke`).

PyPI package must be ≥ 0.3.3 for `GovernedToolSet` and structured denials; or install from source: `pip install -e faramesh-python-sdk`.

## Registry signing (maintainers)

```bash
# Run from faramesh-registry repo root — not a parent monorepo path
gh secret set REGISTRY_SIGNING_KEY_B64 \
  --repo faramesh/faramesh-registry \
  --body "$(cat .secrets/REGISTRY_SIGNING_KEY_B64)"
```

If `cat` fails, you are in the wrong directory. Paste the single-line base64 secret when prompted.

After key rotation: update `catalog/trust/keys.json`, re-run `make sign-catalog`, and update `trust { }` blocks in docs and sample `governance.fms` files.

## OS-tier sandbox not active

Set `runtime { os_tier = true }` in `governance.fms`, run `faramesh apply`, then start the agent with `.faramesh/bin/agent -- …`. `faramesh dev` keeps application-tier enforcement only (no OS sandbox).

## More help

- [Contributing](/guides/contributing/) — repo layout and PR flow
- [Security model](/security/) — threat mitigations and limits
- [GitHub issues](https://github.com/faramesh/faramesh-core/issues)
