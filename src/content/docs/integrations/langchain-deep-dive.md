---
title: LangChain Integration — Deep Dive
description: Detailed guide for integrating Faramesh with LangChain, covering interception patterns, policy enforcement, delegation examples, SDK usage, and production hardening.
---

## Overview

This deep-dive describes practical patterns for integrating Faramesh into LangChain-based applications. It focuses on runtime governance: intercepting LLM requests, canonicalizing inputs, applying policy (FPL) checks, managing credentials and delegation, and operational concerns for production deployments.

Goals:

- Show how to intercept LangChain LLM calls in Python and Node to enforce policies.
- Provide canonicalization and policy examples for prompt control, tool use, and data exfiltration prevention.
- Demonstrate delegation grants for limited agent capabilities.
- Explain monitoring, metrics, and production hardening recommendations.

Audience: engineers building LLM-powered services that require governance, auditability, or credential brokering.

---

## Architecture Summary

High-level flow when integrating Faramesh with LangChain:

1. Application code calls a LangChain LLM wrapper (e.g., `OpenAI`, `ChatOpenAI`).
2. A Faramesh interception layer (middleware, proxy, or sidecar) receives canonical request: {
   - `agent`: calling service identity
   - `input`: canonicalized prompt or messages
   - `tools`: declared tool invocations (if any)
   - `secrets`: references to credentials (never raw secrets)
}
3. Faramesh canonicalizes inputs (deterministic, normalized whitespace, placeholders) and computes a request fingerprint.
4. The policy engine evaluates FPL rules for allow/deny/modify.
5. If allowed, Faramesh may mutate the request (insert redactions, add metadata), supply ephemeral credentials via credential-sequestration, or deny the request with an audit record.
6. The LLM call proceeds using the provided (or original) network call method. All decisions are recorded to the audit ledger with a signed DPR entry.

Integration options:

- In-process middleware (Python/Node): wrap the LangChain LLM client and call Faramesh SDK to evaluate policies synchronously.
- Local sidecar (HTTP/UNIX socket): application sends canonical request to local Faramesh daemon which returns a decision.
- Network proxy / gateway (MCP interception): especially for centralized fleets and multi-service topologies.

Trade-offs:

- In-process: lowest latency, but requires embedding governance libraries into the application.
- Sidecar/proxy: language-agnostic, centralizes policy, easier to update policies without deploying apps.
- Gateway: powerful for multi-tenant, but introduces a network hop and requires robust auth between services.

---

## Recommended Integration Patterns

### 1) In-process Python middleware (preferred for small teams)

- Wrap LangChain `LLM` classes via subclassing or a custom `LLM` wrapper.
- Use Faramesh Python SDK to call `evaluate_request()` which returns an allow/deny and optional `mutations` or `credential` material.
- Keep canonicalization deterministic: use the SDK helper `canonicalize_text()`.

Example wrapper (conceptual):

```python
from langchain.llms import OpenAI
from faramesh import FarameshClient

class FarameshGuardedOpenAI(OpenAI):
    def __init__(self, *args, faramesh_client: FarameshClient, **kwargs):
        super().__init__(*args, **kwargs)
        self.faramesh = faramesh_client

    def _call(self, prompt, stop=None):
        req = {
            "agent": self.faramesh.agent_id,
            "input": self.faramesh.canonicalize_text(prompt),
            "meta": {"client": "langchain", "model": self.model_name},
        }
        decision = self.faramesh.evaluate_request(req)
        if not decision.allow:
            raise Exception(f"Request denied: {decision.reason}")
        # Apply safe mutations if present
        prompt = decision.mutate_text(prompt) if decision.mutations else prompt
        # If credential was provided, inject via SDK-managed transport
        with self.faramesh.credential_scope(decision.credential) as creds:
            return super()._call(prompt, stop=stop)
```

Notes:
- Use context managers for ephemeral credentials so secrets are not logged or leaked.
- Keep the SDK call timeout bounded (e.g., 200–500ms) to avoid request stalls.

### 2) Local sidecar (Unix socket / HTTP)

- Start a Faramesh local daemon configured for `--agent id=...`.
- App canonicalizes request and POSTs to `/v1/inspect` or similar endpoint.
- Daemon returns a decision and optional mutations.

Advantages:
- Language-agnostic: any LangChain runtime (Python, Node) can call the socket.
- Centralized auditing per-host.

Caveats:
- Ensure robust authentication between app and sidecar (local mTLS or token).
- Keep privacy: do not send raw user PII outside isolation unless necessary.

### 3) Network gateway / MCP interception

- Useful for multi-service platforms where a single ingress can enforce policies.
- Configure gateway to intercept outgoing LLM calls, canonicalize, and call the policy engine.

Best practices:
- Use `bearer_or_mtls` edge auth modes to allow flexible deploy topologies.
- Implement retries and timeouts so gateway failures fail-safe (deny or shadow with alert).

---

## Canonicalization Guidance for LangChain

Canonicalization is critical to produce stable policy evaluations and sensible audit entries.

Rules:

- Normalize Unicode to NFC.
- Strip trailing/leading whitespace and collapse multi-space sequences to single spaces except within code blocks.
- Remove variable session metadata (timestamps, ephemeral IDs) or replace with placeholder tokens.
- For chat APIs, canonicalize the `role`/`content` structure in a stable order.
- For tool calls, represent tools as structured elements: `tool:{name} args:{...}` rather than free-text.

Example canonicalization for chat messages:

Input (user):
```
User: Can you access https://internal.example.com/data and summarize?
```

Canonicalized form (for policy):
```
[USER_MESSAGE] Can you access <URL_REDACTED> and summarize?
```

Policy authors should write rules against canonical shapes rather than raw text where possible.

---

## Example FPL Policies for LangChain Scenarios

1) Deny outbound URL fetches from non-privileged agents:

```
agent "untrusted-webhook" {
  when true {
    deny if input.match("<URL_REDACTED>")
  }
}
```

2) Allow tool use only when a standing grant exists:

```
agent "qa-service" {
  when true {
    allow if has_grant("tooling:fetch_internal_data")
    else deny with message("Tooling grant required")
  }
}
```

3) Redact secrets or credential patterns before sending to model:

```
agent "*" {
  when true {
    mutate input = redact_secrets(input)
  }
}
```

4) Shadow mode for canary rollout:

```
agent "experimental-model*" {
  when true {
    shadow if percent(5)
  }
}
```

Shadow entries are recorded in audit but not enforced; use them to collect false-positives before enforcement.

---

## Delegation Example (Ephemeral Tool Grant)

Use delegation grants to give a LangChain agent short-lived permission to call internal tools.

Flow:

1. Operator creates a standing grant `delegate grant create --to qa-service --scope tooling:fetch_internal_data --ttl 1h`.
2. Faramesh stores the grant in `delegate_grants` and returns a token `del_<b64>.<hmac>`.
3. LangChain runtime requests the token via an admin flow or via an OIDC flow delegated to the agent.
4. For each request, the app attaches the grant token and Faramesh validates it server-side.

In code (pseudo):

```python
# Requesting ephemeral usage
decision = faramesh.evaluate_request({
    "agent": "qa-service",
    "input": canonical_prompt,
    "delegation_token": "del_..."
})
if not decision.allow:
    raise Exception("Denied")
# else proceed
```

Best practice: keep grants minimized in scope and life-span.

---

## SDK Usage Patterns (Python)

- Use `FarameshClient.evaluate_request()` for synchronous checks.
- Use `FarameshClient.credential_scope(...)` context manager to get ephemeral credentials and automatically revoke/expiry handling.
- Use non-blocking health checks and local caches for policy data to reduce evaluation latency.

Example:

```python
from faramesh import FarameshClient
client = FarameshClient(socket_path="/run/faramesh.sock")

with client.credential_scope("vault:read:secrets/db") as creds:
    result = llm.call(prompt, api_key=creds.api_key)
```

Caching:
- Cache allow decisions for idempotent requests where safe (e.g., model temperature=0 deterministic tasks).
- TTL should be conservative (seconds to minutes) depending on risk appetite.

---

## LangChain-Specific Hooks and Tooling

LangChain offers multiple extension points where Faramesh can be attached:

- `LLM` wrappers (synchronous calls)
- `Agent` tool handlers (before/after tool invocation)
- `Chains` (pre/post process chains)

Key places to enforce policy:

- Pre-LLM call: deny or mutate prompts
- Pre-tool call: check tool-specific grants
- Post-LLM response: redact or detect exfiltration (e.g., secret patterns) and record an audit event

Example: tool wrapper to check rights before allowing `requests.get` from tools.

---

## Observability and Metrics

Expose the following metrics from the Faramesh sidecar/SDK for scraping by Prometheus:

- `faramesh_requests_total{decision=allow|deny|shadow}`
- `faramesh_policy_eval_duration_seconds{policy_pack=...}` (histogram)
- `faramesh_credential_issue_total{type=vault|aws|gcp}`
- `faramesh_audit_dpr_signed_total`

Tracing:
- Instrument the evaluate_request path with OpenTelemetry spans.
- Tag spans with `agent_id`, `policy_result`, and `request_fingerprint`.

Logging:
- Only log request metadata and canonical forms (never raw secrets).
- Keep redaction deterministic so logs are consistent and searchable.

---

## Production Hardening

1. Fail-closed vs fail-open: choose deny-by-default for high-risk flows. For low-risk exploratory functions, shadow mode then opt into enforce.
2. Timeouts: SDK calls to Faramesh should have conservative timeouts. If the interceptor times out, default to either deny or shadow per policy.
3. Credential brokering: never return raw long-lived secrets. Use ephemeral credentials (Vault AppRole short TTL or STS AssumeRole with short session).
4. Rate-limiting: apply per-agent quotas for LLM calls to prevent runaway cost or abuse.
5. Canary rollout: enable rules in shadow mode for a small percentage and gradually increase coverage.
6. Key rotation: rotate DPR signing keys and HMAC keys and rehearse audit verification.

---

## Debugging Tips

- If a request is unexpectedly denied, reproduce by sending the canonicalized request to Faramesh `inspect` endpoint.
- Use shadow mode to collect examples without breaking traffic.
- Collect the `request_fingerprint` from logs/audit to correlate model outputs with policy decisions.
- Verify delegation tokens in `delegate_grants` table for expiry and scope.

---

## Example End-to-End (Python)

1) App starts Faramesh sidecar with agent identity `qa-service`.
2) App configures LangChain to use `FarameshGuardedOpenAI` wrapper.
3) App calls chain; wrapper sends canonical request to sidecar.
4) Sidecar evaluates policy, returns allow and ephemeral Vault credential.
5) Wrapper injects the credential into the tool client and performs the LLM call.
6) Sidecar emits audit DPR record with reference to the request fingerprint.

---

## FAQ

Q: Should I send raw user data to Faramesh for evaluation?
A: Prefer canonicalized and redacted forms. If raw PII must be evaluated, ensure minimal retention and consent.

Q: Does this add latency?
A: Yes — but typical in-process SDK calls add ~10–50ms; sidecar/proxy adds an extra network hop. Optimize caching and use local caches for low-risk decisions.

Q: How to test policy changes safely?
A: Use `shadow` mode, run unit tests with canonicalized fixtures, and use synthetic traffic to validate false-positive rates.

---

## Checklist Before Enabling Enforcement

- [ ] Run policies in shadow mode for 1–2 weeks.
- [ ] Monitor `deny`/`shadow` rates and review false positives.
- [ ] Ensure credential brokering is audited and rotated.
- [ ] Add Prometheus metrics and dashboards for `faramesh_policy_eval_duration_seconds` and `faramesh_requests_total`.
- [ ] Confirm that DPR audit verification passes with the current key set.

---

## References

- See `faramesh-core/docs/fpl/LANGUAGE_REFERENCE.md` for FPL details.
- See `faramesh-core/docs/guides/DELEGATION_GRANTS.md` for grant flows.
- SDK reference: `faramesh-python-sdk` and `faramesh-node-sdk`.



<!-- End of LangChain deep-dive -->
