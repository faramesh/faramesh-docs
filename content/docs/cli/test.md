---
title: faramesh test
description: Run policy fixtures against the compiled engine.
---

```bash
faramesh test [--dir DIR]
```

Executes bundled or local policy test cases (CAR fixtures) against the compiled policy from `governance.fms`. Use in CI after `check` and before `apply`.

For full daemon integration, use `faramesh-core/tests/e2e_zero_governed.sh` in the core repository.
