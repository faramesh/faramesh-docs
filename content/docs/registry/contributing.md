---
title: Contribute to the registry
description: Publish a policy pack from existing rules in about 30 minutes. No maintainer access required for community artifacts.
---

This guide takes you from **existing governance rules** (for example Stripe refund limits you already enforce) to a **published policy pack** in the [faramesh-registry](https://github.com/faramesh/faramesh-registry) catalog. Maintainers sign official artifacts; community contributors open a PR and consumers pin your publisher key.

**Time:** about 30 minutes if you already have FPL or can translate your rules.

**You need:** `faramesh` CLI, a GitHub account, and a fork of `faramesh-registry`.

## 1. Fork and clone (5 min)

```bash title="Terminal"
git clone https://github.com/<your-user>/faramesh-registry.git
cd faramesh-registry
```

## 2. Copy an existing policy pack (2 min)

```bash title="Terminal"
cp -r catalog/artifacts/policies/faramesh/stripe/1.0.0 \
      catalog/artifacts/policies/faramesh/<your-pack>/1.0.0
```

Replace `<your-pack>` with a short name (`acme-payments`, `support-refunds`, etc.).

## 3. Edit `policy.fpl` (15 min)

**File:** `catalog/artifacts/policies/faramesh/<your-pack>/1.0.0/policy.fpl`

Translate your rules into FPL. Minimal example:

```hcl title="policy.fpl"
pack "acme-payments" {
  version = "1.0.0"

  agent "payments-bot" {
    default deny

    rules {
      permit stripe/refund if amount < $500
      defer  stripe/refund if amount >= $500
      deny   stripe/payouts
    }

    rate_limit "stripe/*": 10 per minute
  }
}
```

Run validation from the registry root:

```bash title="Terminal"
./scripts/validate-catalog.sh
```

Fix any errors before continuing.

## 4. Register in the catalog index (3 min)

**File:** `catalog/catalog.json`

Add an entry under `policies` (copy an existing block and change ids):

```json title="catalog.json"
{
  "id": "policies/faramesh/acme-payments/1.0.0",
  "path": "artifacts/policies/faramesh/acme-payments/1.0.0",
  "trust_tier": "community",
  "publisher": "your-github-org-or-user"
}
```

Add `README.md` beside the artifact describing what the pack does and required provider config.

## 5. Validate and open a PR (5 min)

```bash title="Terminal"
./scripts/validate-catalog.sh
git checkout -b add-policy-acme-payments
git add catalog/
git commit -m "registry: add acme-payments policy pack 1.0.0"
git push -u origin HEAD
```

Open a pull request against `faramesh/faramesh-registry`. Describe:

- What tools and effects the pack governs
- Example `import` line consumers will use
- Any external dependencies (Vault paths, Stripe, etc.)

Official maintainers run signing after merge. Community packs stay `trust_tier: "community"` until promoted.

## 6. Consume your pack

In a project `governance.fms`:

```hcl title="governance.fms"
import "github.com/faramesh/faramesh-registry/policies/faramesh/acme-payments@1.0.0"

trust {
  key "your-publisher-key-id" = "BASE64_PUBLIC_KEY_FROM_README"
}
```

```bash title="Terminal"
faramesh check
faramesh dev
```

## Community vs official

| | Community | Official (`faramesh`) |
|---|-----------|------------------------|
| Signing | PR only; consumers pin your key | Signed with registry Ed25519 key |
| `trust_tier` | `community` | `official` |
| Review | Maintainer review on PR | Maintainer team |

## Related

- [Publish overview](/registry/publish/)
- [Policy packs](/registry/policies/)
- [Versioning](/registry/versioning/)
