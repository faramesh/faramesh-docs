---
title: How does faramesh init work?
---

```bash
faramesh init [--dir DIR] [--offline] [--non-interactive] [--yaml|--json]
```

Faramesh detects the framework, discovers tools, and writes `governance.fms`. It refuses to overwrite an existing file (exit 1). It never starts the daemon.

Next: [Stack format](/stack/).
