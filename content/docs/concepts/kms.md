---
title: KMS and signing
description: How Faramesh signs Decision Provenance Records with an external KMS so daemon compromise cannot forge the audit chain.
---

The audit chain is only as strong as its signing key. If the key lives next to the daemon, an attacker who roots the host can forge DPRs. **External KMS signing** moves the private key out of the daemon process, the daemon can request signatures, but it can never produce them on its own.

This page covers what's signed, how, by which keys, and how to verify it.

## What gets signed

Every Decision Provenance Record carries a detached signature over its canonical bytes. The signature is the last field added to the DPR before it's written to the WAL.

```text title="Output"
canonical_dpr_bytes = canonicalize({ id, time, agent_id, tool, args_hash, effect, rule_ref, prev_hash, ... })
signature           = KMS.sign(key_id, canonical_dpr_bytes)
DPR.signature       = signature
```

The signature commits to:

- The decision (effect, rule, conditions)
- The arguments (their hash)
- The credential issuance (its reference)
- The chain link (prev_hash)
- The policy version (its hash)

Tampering with any of those breaks the signature.

## Signing modes

| Mode | Where the private key lives | Production-ready? |
|------|------------------------------|-------------------|
| **Local** | Ephemeral ed25519 key on disk in `wal_dir/` | No, use only for [local runs](/cli/dev/) and CI fixtures. |
| **External KMS** | AWS KMS, GCP KMS, Azure Key Vault, HashiCorp Vault Transit | Yes. |
| **HSM** | PKCS#11 device | Yes, for air-gapped and highest-assurance setups. |

In `enforce` mode, `faramesh apply` refuses to launch with the local-key mode unless `runtime { signing_warning_acknowledged = true }` is explicit. The default posture is **fail closed** on weak signing.

## AWS KMS

```hcl title="governance.fms"
provider "kms-aws" {
  type    = "aws-kms"
  region  = "us-east-1"
  key_arn = env("FARAMESH_KMS_KEY_ARN")
}
```

| Field | Description |
|-------|-------------|
| `region` | AWS region of the KMS key. |
| `key_arn` | KMS key ARN. The key's spec must be `ECC_NIST_P256` or `ECC_NIST_P384`. RSA keys are rejected. |
| `role_arn` | Optional STS role to assume before calling KMS. |
| `signing_algorithm` | Defaults to `ECDSA_SHA_256`. |

**IAM scope.** The role calling KMS needs only `kms:Sign` and `kms:GetPublicKey`. No `kms:Decrypt`, no `kms:GenerateDataKey`. Keep the policy minimal.

## GCP KMS

```hcl title="governance.fms"
provider "kms-gcp" {
  type     = "gcp-kms"
  project  = "faramesh-prod"
  key      = "projects/.../locations/global/keyRings/.../cryptoKeys/faramesh-dpr/cryptoKeyVersions/1"
}
```

The key purpose must be `ASYMMETRIC_SIGN` and the algorithm `EC_SIGN_P256_SHA256` (the daemon's reference) or `EC_SIGN_P384_SHA384`.

## Azure Key Vault

```hcl title="governance.fms"
provider "kms-azure" {
  type        = "azure-key-vault"
  vault_url   = "https://faramesh.vault.azure.net"
  key_name    = "faramesh-dpr"
  key_version = "abc123..."          # optional, omit for latest
}
```

Authenticate via Managed Identity, Service Principal, or env-var-based credential, the standard Azure auth chain.

## HashiCorp Vault Transit

```hcl title="governance.fms"
provider "kms-vault" {
  type      = "vault-transit"
  addr      = env("VAULT_ADDR")
  token     = env("VAULT_TOKEN")
  mount     = "transit"
  key       = "faramesh-dpr"
}
```

The key type must be `ed25519` or `ecdsa-p256`. Faramesh batches signing requests so a single Vault round-trip signs many DPRs.

## HSM via PKCS#11

For air-gapped or compliance-mandated setups:

```hcl title="governance.fms"
provider "kms-hsm" {
  type        = "pkcs11"
  module_path = "/usr/lib/softhsm/libsofthsm2.so"
  slot        = 0
  key_label   = "faramesh-dpr"
  pin         = env("HSM_PIN")
}
```

## Signing in the hot path

Signing is **not on the synchronous decision path**. The daemon:

1. Builds the DPR.
2. Returns the decision to the caller (`permit`/`defer`/`deny`).
3. Queues the DPR for signing.
4. The signer batches and signs.
5. Signed DPRs are committed to the WAL.

If signing falls behind the decision rate, the WAL queues unsigned DPRs into a sealed staging segment. `faramesh status` shows the queue depth. Decisions still flow; the chain remains verifiable as soon as the signer catches up.

In **strict signing mode** (`runtime { signing_required = true }`), the daemon waits for signature completion before returning `permit` to the caller. Adds 4–12 ms per call but produces a chain with no unsigned tail.

## Key rotation

Rotation is a configuration change. Add a new key version, update `key_version` (or let the cloud KMS auto-promote the latest), and re-apply:

```bash title="Terminal"
faramesh apply
```

The daemon includes the active `key_id` in every DPR. When you rotate, new DPRs reference the new key id. Verification checks each DPR against the key id it used at signing time, so rotated keys do not break older chains.

`faramesh audit verify` emits a per-key-version summary:

```
Verifying WAL segments 1..14 (188,310 DPRs)
  signing scheme : aws-kms (key/abc-123, key/def-456)
  per-key counts : key/abc-123 → 122,041 ; key/def-456 → 66,269
  chain hash root : ok
✓ Chain is intact across the rotation.
```

## Verifying a chain offline

`faramesh audit export --include-public-keys --from --to ...` exports the DPRs **plus** the public-key material needed to verify them, in a self-contained JSON bundle.

```bash title="Terminal"
faramesh audit verify-bundle export.json
```

This works without network access to the KMS, useful when you hand evidence to an auditor on a USB drive or to a regulator's air-gapped system.

The verifier:

1. Parses each DPR from the bundle.
2. Reconstructs the canonical bytes.
3. Verifies the signature against the bundled public key for the recorded `key_id`.
4. Verifies `prev_hash` continuity.
5. Reports any break with the offending DPR id.

## Daemon compromise scenarios

| Attack | What an external KMS prevents |
|--------|-------------------------------|
| Attacker roots the host and re-signs a forged DPR. | Cannot, no private key on the host. KMS would need to be called for every forgery, leaving call records in the KMS audit log. |
| Attacker rewrites the WAL to reorder events. | Detected, `prev_hash` continuity breaks. |
| Attacker swaps the public key the verifier checks against. | Detected, public-key fingerprint is recorded in the trust bundle and the export. |
| Attacker downgrades to local-key mode. | The daemon emits a `provider_change` DPR signed with the **old** key. Auditors see the downgrade explicitly. |

External KMS doesn't make compromise impossible. It makes compromise **provable**.

## Cost

Most KMS providers charge per signature. At typical agent volume:

| Volume | Cost (AWS KMS) | Cost (GCP KMS) | Cost (Vault Transit) |
|--------|----------------|----------------|----------------------|
| 1M decisions/month | ~$0.03 + $1/key/month | ~$0.06/M ops | self-hosted |
| 100M decisions/month | ~$3 + $1/key/month | ~$6 + key cost | self-hosted |

The daemon batches signatures to amortize per-call cost. Real-world signing latency on warm KMS connections is 4–12 ms.

## What's next

- [Auditing](/concepts/auditing/). DPR schema and chain verification
- [Providers → KMS](/providers/#kms--signing-provider): full KMS provider reference
- [Security model](/security/): what KMS-backed signing protects against
