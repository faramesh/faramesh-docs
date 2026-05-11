---
title: Deterministic Canonicalization
description: How identical intent becomes an identical hashable byte-stream.
---

Canonicalization makes semantically identical payloads produce the same bytes before hashing. Without it, `{"amount": 100.0}`, `{"amount": 100}`, and `{"amount": 1e2}` are different byte sequences even though they mean the same thing.

The Python SDK implementation in `sdk/python/faramesh/canonicalization.py` and the Node implementation in `sdk/node/src/canonicalization.ts` both do the same core work:

```python
sorted_keys = sorted(value.keys())
result.append('\\"')
if value == 0.0:
    return "0"
```

The transformations are straightforward:

- keys are sorted lexicographically
- strings are escaped deterministically
- floats are normalized so exponent notation and trailing zeros disappear
- `null`, booleans, arrays, and nested objects are serialized predictably
- ephemeral action fields such as `id`, `decision`, `status`, `risk_level`, and `request_hash` are excluded from the action hash input

The output is a SHA-256 hash of the canonical byte stream. That hash is what makes replay detection, immutable audit trails, and policy matching reliable across clients and runtimes.

See [Canonicalization Deep Dive](/architecture/canonicalization-deep-dive/) for the implementation details and [Cryptographic Hashing](/security/cryptographic-hashing/) for why the hash matters operationally.
