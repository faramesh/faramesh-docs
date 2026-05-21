---
title: Offboarding and decommissioning
description: Remove Faramesh enforcement, export final audit evidence, and retire stacks cleanly.
---

## Before you remove Faramesh

1. **Export audit evidence**

   ```bash
   faramesh audit export --stack ./my-stack --out ./audit-archive
   faramesh audit verify --stack ./my-stack
   ```

2. **Revoke brokered credentials**: rotate Vault paths, cloud IAM roles, and API keys that providers issued to agents.

3. **Document final policy**: archive `governance.fms`, `governance.compiled.json`, and import pins for retention policy.

## Stop enforcement

```bash
faramesh destroy --stack ./my-stack
```

Or remove the daemon unit / sidecar from orchestration manifests and redeploy agents **without** the SDK shim or MCP proxy URL.

## Remove interception

| Tier | Undo |
|------|------|
| SDK shim | Restore native tool list in agent code |
| MCP proxy | Point MCP client back to original server URL |
| HTTP proxy | Restore direct vendor endpoint |

## Clean local state

```bash
faramesh uninstall --binary-only
```

Use `faramesh uninstall --purge` when you also want to remove cached providers, import cache, WAL, and other local Faramesh artifacts.

If you are offboarding a source checkout, run the same command from inside the stack directory so it can remove local stack state as well.

## Partial offboarding

To keep audit but pause enforcement, use `runtime { mode = "monitor" }` (if enabled in your version) or detach providers while retaining WAL verify behavior in staging first.

## Related

- [Flows](/flows/)
- [Auditing](/concepts/auditing/)
