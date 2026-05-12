# Short Docs Pages Report

This report lists docs content files under 200 words to prioritize expansion and verification against `faramesh-core`.

Threshold: 200 words

Files found (word count):

- 70 src/content/docs/hitl/email-routing.md
- 83 src/content/docs/architecture/storage-model.md
- 91 src/content/docs/deployment/nexus.md
- 91 src/content/docs/security/cryptographic-hashing.md
- 92 src/content/docs/integrations/autogen.md
- 93 src/content/docs/integrations/llamaindex.md
- 98 src/content/docs/reference/sdk-client.md
- 99 src/content/docs/deployment/kubernetes.md
- 101 src/content/docs/architecture/overview.md
- 102 src/content/docs/deployment/horizon.md
- 102 src/content/docs/policies/overview.md
- 102 src/content/docs/reference/environment-variables.md
- 103 src/content/docs/architecture/policy-evaluation.md
- 103 src/content/docs/hitl/slack-routing.md
- 103 src/content/docs/integrations/dspy.md
- 104 src/content/docs/deployment/database.md
- 104 src/content/docs/hitl/approval-workflows.md
- 105 src/content/docs/architecture/canonicalization-deep-dive.md
- 106 src/content/docs/integrations/crewai.md
- 108 src/content/docs/reference/policy-schema.md
- 108 src/content/docs/security/fail-closed.md
- 110 src/content/docs/identity/secrets-management.md
- 112 src/content/docs/integrations/langchain.md
- 114 src/content/docs/architecture/request-lifecycle.md
- 114 src/content/docs/integrations/mcp.md
- 115 src/content/docs/integrations/nodejs-sdk.md
- 116 src/content/docs/deployment/configuration.md
- 117 src/content/docs/deployment/docker-compose.md
- 119 src/content/docs/identity/agent-identities.md
- 121 src/content/docs/integrations/langgraph.md
- 124 src/content/docs/integrations/python-sdk.md
- 125 src/content/docs/security/prompt-injection-defense.md
- 127 src/content/docs/deployment/self-hosted.md
- 128 src/content/docs/reference/api.md
- 128 src/content/docs/security/threat-model.md
- 129 src/content/docs/hitl/overview.md
- 131 src/content/docs/hitl/web-ui.md
- 134 src/content/docs/policies/advanced-conditions.md
- 140 src/content/docs/concepts/audit-ledger.md
- 140 src/content/docs/policies/risk-levels.md
- 148 src/content/docs/concepts/risk-scoring.md
- 150 src/content/docs/policies/rules-and-matching.md
- 156 src/content/docs/integrations/govern-your-own-tool.md
- 160 src/content/docs/concepts/zero-trust-execution.md
- 163 src/content/docs/concepts/policy-engine.md
- 174 src/content/docs/index.mdx
- 175 src/content/docs/concepts/deterministic-canonicalization.md
- 192 src/content/docs/concepts/why-faramesh.md
- 192 src/content/docs/getting-started/introduction.md

Next steps suggested:

- For each file above, draft a concise expansion that references exact code paths in `faramesh-core` (examples: CLI commands in `faramesh-core/cmd/`, API handlers in `faramesh-core/faramesh` packages, relevant Go structs for policy/schema).
- Do not fabricate commands or code; verify each example against `faramesh-core` before updating the docs.
- Remove em dashes and marketing tone; use neutral, enterprise voice and concrete examples.
- Prioritize expansions for: reference pages, deployment guides, and integration SDK pages.

If you want, I can open PR patches for the top N files (suggest N=5) with draft content that cites exact `faramesh-core` files. Otherwise I can create issues/todos for each file.
