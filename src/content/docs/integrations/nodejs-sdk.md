---
title: Node.js SDK
description: Install and use the Faramesh Node.js SDK.
---

The Node SDK exports the same core surface as the Python package. The main entry points from `sdk/node/src/index.ts` are `configure`, `submitAction`, `submitActions`, `submitActionsBulk`, `submitAndWait`, `blockUntilApproved`, `getAction`, `listActions`, `approveAction`, `denyAction`, `startAction`, `waitForCompletion`, `tailEvents`, `streamEvents`, `allow`, `deny`, `gateDecide`, `gateDecideDict`, `replayDecision`, and `executeIfAllowed`.

`ClientConfig` supports `baseUrl`, `agentId`, `token`, timeout and retry controls, plus request lifecycle callbacks.

```typescript
import { configure, submitAction } from "@faramesh/sdk";

configure({ baseUrl: "http://localhost:8000", token: "dev-token" });
const action = await submitAction("finance-agent", "stripe", "refund", { amount: 75 });
```

The Node client also exposes `governedTool()` for wrapping arbitrary functions with the governance flow.

See [Govern Your Own Tool](/integrations/govern-your-own-tool/) and [SDK Client Reference](/reference/sdk-client/).
