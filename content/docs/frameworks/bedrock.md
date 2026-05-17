---
title: Bedrock
description: Govern AWS Bedrock action group invocations with the Faramesh HTTP proxy.
---

Bedrock agents invoke action groups over HTTP. Faramesh's HTTP proxy sits in front of your action group endpoint, every call is evaluated by the daemon before it forwards to the real handler (Lambda, ECS, anything serving the Bedrock OpenAPI schema).

**Tier:** HTTP proxy. **Latency overhead:** 5–15 ms per call.

## Wiring

```text title="Output"
Bedrock agent  →  Faramesh HTTP proxy  →  Action group handler (Lambda)
                         ↓
                 policy engine, WAL, providers
```

## Set up

### 1. Declare the HTTP listener

```hcl title="governance.fms"
import "registry.faramesh.dev/frameworks/bedrock@1.0.0"

runtime {
  mode        = "enforce"
  http_listen = "0.0.0.0:8443"
}

agent "bedrock-ops" {
  default deny

  rules {
    permit lookup_customer
    defer  refund_order if amount >= $100
    permit refund_order if amount <  $100
    deny   delete_customer
  }

  rate_limit "*": 200 per minute
}
```

### 2. Deploy the proxy

Run Faramesh anywhere with network reach to your action group backend, same VPC, an ECS task, or Lambda Web Adapter. Point Bedrock's action group URL at the proxy.

### 3. Forward to the real handler

Set the upstream URL via env or in `runtime`:

```hcl title="governance.fms"
runtime {
  http_listen   = "0.0.0.0:8443"
  http_upstream = "https://lambda-url.example.com"
}
```

## OpenAPI

Faramesh reads the Bedrock action group OpenAPI document to map paths and parameters to tool names. The operation `operationId` becomes the tool id in policy:

```yaml title="config.yaml"
paths:
  /customers/{id}:
    get:
      operationId: lookup_customer
  /orders/{id}/refund:
    post:
      operationId: refund_order
```

Conditions in policy reference parameters by name (`amount`, `id`, etc.):

```hcl title="governance.fms"
permit refund_order if amount < $100
```

## TLS

The proxy terminates TLS on its listener. Provide certs via `runtime`:

```hcl title="governance.fms"
runtime {
  http_listen   = "0.0.0.0:8443"
  tls_cert_file = "/etc/faramesh/server.crt"
  tls_key_file  = "/etc/faramesh/server.key"
}
```

## What's next

- [Stack reference → enforcement](/stack/#enforcement)
- [Providers](/providers/). AWS Secrets Manager, KMS, audit sinks
- [Denial codes](/errors/)
