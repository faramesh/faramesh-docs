---
title: Registry
description: Pinned, signed, versioned distribution for providers, policy packs, and framework profiles.
---

The **Faramesh Registry** at `registry.faramesh.dev` is where signed artifacts live. The CLI resolves every import from the registry at `faramesh check` and `faramesh apply`.

Three artifact kinds are distributed:

| Kind | What it is | Example |
|------|-----------|---------|
| **Provider** | Signed binary implementing `ProviderService` (gRPC). | `faramesh/vault@2.1.0` |
| **Policy pack** | Versioned set of FPL rules, redactions, rate limits. | `faramesh/pci-dss@1.2.0`, `faramesh/stripe@1.3.0` |
| **Framework profile** | FPL wiring for one framework's interception tier. | `frameworks/langgraph@1.0.0`, `frameworks/mcp@1.0.0` |

## Import syntax

```fpl
import "registry.faramesh.dev/frameworks/langgraph@1.0.0"
import "registry.faramesh.dev/policies/stripe@1.3.0"     as stripe_rules
import "registry.faramesh.dev/providers/vault@2.1.0"
```

- A pinned semver is required. `@latest` is rejected at `check`.
- `as <alias>` lets you reference the imported symbols by a short name.
- Multiple imports of the same kind are allowed; FPL composes them.

## How imports resolve

At `faramesh check`:

1. The CLI fetches `<registry>/.well-known/faramesh.json` to discover artifact endpoints.
2. Each import is downloaded with its signature and provenance manifest.
3. Signatures are verified against the public keys in your `trust { ... }` block.
4. Resolved imports are cached in `.faramesh/cache/`. The cache is content-addressed by digest.

A failed signature aborts the build. There is no fallback path for an untrusted artifact.

## Trust roots

```fpl
trust {
  key "registry.faramesh.dev" ed25519:MCowBQYDK2VwAyEA...
}
```

`faramesh init` writes the default Faramesh trust root. Add more keys for private registries you publish to yourself.

## Browsing the catalog

Open `https://registry.faramesh.dev` in a browser. Each artifact page shows:

- Versions with semver tags.
- The signed digest and signing key.
- A copy-paste `import` line.
- The rule set or provider schema in the case of policy packs and providers.

## Offline use

`faramesh bundle` packs every resolved import into a single tarball:

```bash
faramesh bundle --include-providers --out faramesh-bundle.tar
```

Distribute the tarball to an air-gapped environment and unpack it next to `governance.fms`. `faramesh apply --offline` then resolves from the bundle without any network access.

## Self-hosting a registry

If you run your own internal registry, point Faramesh at it:

```bash
export FARAMESH_REGISTRY_URL=https://registry.internal.corp
faramesh check
```

Add your registry's public key to `trust { ... }` so artifacts you publish are verified. The self-host implementation lives in the `faramesh-registry` repository.

## Publishing

Authenticate, then push:

```bash
faramesh auth login --registry registry.internal.corp
faramesh publish ./my-policy-pack --kind policy --version 1.0.0
```

The CLI signs the artifact with your private key, computes the digest, and uploads the binary, signature, and manifest. The registry rejects any artifact whose signature does not verify against an enrolled publisher key.

## What's next

- [Providers](/providers/) — the provider catalog
- [Stack reference](/stack/) — where imports go in `governance.fms`
- [CLI](/cli/) — `faramesh auth`, `faramesh bundle`, `faramesh publish`
