---
title: Canonicalization Deep Dive
description: The technical implementation of deterministic canonicalization.
---

The Python and Node canonicalizers both sort keys, preserve list order, escape strings consistently, normalize floats, and exclude ephemeral action fields before computing the request hash.

That is the entire point of the module: semantically identical intent should produce the same bytes, even if the model formats numbers or key order differently.

```python
def canonicalize_action_payload(payload: dict) -> bytes:
    clean_payload = {}
    for key, value in payload.items():
        if key in _ACTION_EXCLUDE_FIELDS or key.startswith("_"):
            continue
        clean_payload[key] = value
    return canonicalize(clean_payload).encode("utf-8")
```

See [Deterministic Canonicalization](/concepts/deterministic-canonicalization/) for the why and [Cryptographic Hashing](/security/cryptographic-hashing/) for the security outcome.
