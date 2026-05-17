import Link from 'next/link';
import { HomeCard } from '@/components/home/HomeCard';
import { HomeGrid } from '@/components/home/HomeGrid';
import { HomeHero } from '@/components/home/HomeHero';
import { HomeSection } from '@/components/home/HomeSection';

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <HomeHero
        eyebrow="Faramesh"
        title="Governance as code for AI agents."
        body="Declare policy in FPL, enforce it on every tool call, and keep a tamper-evident audit trail. The daemon runs beside your agent; Faramesh Cloud is optional fleet visibility."
        primaryHref="/quickstart"
        primaryLabel="Quickstart →"
        secondaryHref="/concepts/how-it-works"
        secondaryLabel="How it works"
      />

      <HomeSection
        label="Start here"
        intro="Install Faramesh and run a governed agent."
        footer={
          <Link href="/concepts/how-it-works" className="text-fd-primary no-underline hover:underline">
            Learn about Faramesh concepts →
          </Link>
        }
      >
        <HomeGrid cols={2}>
          <HomeCard
            href="/quickstart"
            title="Quickstart"
            icon="▸"
            accent
            bullets={[
              'Install the CLI',
              'faramesh init writes governance.fms',
              'faramesh check / apply',
              'Wire the SDK shim or MCP proxy',
              'See your first permit / defer / deny',
            ]}
          />
          <HomeCard
            href="/concepts/how-it-works"
            title="How Faramesh works"
            icon="◆"
            body="The mental model — where Faramesh sits, the decision pipeline, what's compiled versus evaluated, and how trust boundaries are drawn."
          />
        </HomeGrid>
      </HomeSection>

      <HomeSection
        label="Build with Faramesh"
        intro="Pick the wiring tier that matches your agent runtime."
        footer={
          <Link href="/frameworks" className="text-fd-primary no-underline hover:underline">
            See every framework →
          </Link>
        }
      >
        <HomeGrid cols={3}>
          <HomeCard
            href="/frameworks/langgraph"
            title="Govern a native agent"
            icon="L"
            body="LangGraph, LangChain, CrewAI, OpenAI Agents. One-line SDK shim wraps your tool list."
          />
          <HomeCard
            href="/frameworks/claude-code"
            title="Govern an MCP client"
            icon="M"
            body="Claude Code, Cursor, OpenCode. Point the client at the Faramesh MCP proxy — zero code change."
          />
          <HomeCard
            href="/frameworks/bedrock"
            title="Govern a hosted runtime"
            icon="H"
            body="Bedrock and any OpenAPI action group. The HTTP proxy sits in front of your tool endpoints."
          />
        </HomeGrid>
      </HomeSection>

      <HomeSection label="Concepts" intro="What's actually happening inside the daemon, end to end.">
        <HomeGrid cols={2}>
          <HomeCard
            href="/concepts/enforcement"
            title="Enforcement"
            icon="⊕"
            body="The deterministic decision pipeline — identity, rule match, conditions, rates, budgets, egress, redaction, decision, broker, DPR."
          />
          <HomeCard
            href="/concepts/interception"
            title="Interception"
            icon="⇆"
            body="Four tiers — SDK shim, MCP proxy, HTTP proxy, A2A proxy. Pick one; combine when you need defense in depth."
          />
          <HomeCard
            href="/concepts/identity"
            title="Identity"
            icon="◉"
            body="SPIFFE / SVID, IDP attestation, multi-agent processes, sub-agent delegation chains. The identity model that holds the whole system together."
          />
          <HomeCard
            href="/concepts/topologies"
            title="Topologies"
            icon="◇"
            body="Ten deployment shapes — laptop, sidecar, serverless, multi-region. What counts as one stack and what splits into many."
          />
          <HomeCard
            href="/concepts/credentials"
            title="Credentials"
            icon="✱"
            body="Call-site brokering of short-lived scoped tokens from Vault, AWS, GCP, Azure. The agent never holds a secret."
          />
          <HomeCard
            href="/concepts/auditing"
            title="Auditing"
            icon="✓"
            body="Decision Provenance Records, hash-chained WAL, KMS signing, faramesh audit verify. Tamper-evident by construction."
          />
          <HomeCard
            href="/concepts/kms"
            title="KMS & signing"
            icon="⎔"
            body="External signing for DPR chains so daemon compromise cannot forge audit. AWS KMS, GCP KMS, Vault Transit, Azure Key Vault."
          />
        </HomeGrid>
      </HomeSection>

      <HomeSection
        label="CLI & SDKs"
        intro="The CLI is the primary interface. The SDKs wire it into your agent."
        footer={
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/cli" className="text-fd-primary no-underline hover:underline">
              CLI reference →
            </Link>
            <Link href="/fpl" className="text-fd-primary no-underline hover:underline">
              FPL reference →
            </Link>
            <Link href="/stack" className="text-fd-primary no-underline hover:underline">
              Stack reference →
            </Link>
          </span>
        }
      >
        <HomeGrid cols={2}>
          <HomeCard
            href="/cli"
            title="Faramesh CLI"
            icon="$"
            body="init, check, plan, apply, dev, approvals, audit, explain, rollback, credential. The single binary that operates a stack."
          />
          <HomeCard
            href="/fpl"
            title="FPL language"
            icon="ƒ"
            body="The grammar of governance.fms — imports, runtime, providers, agents, rules, budgets, rate limits, redaction, egress, alerts."
          />
          <HomeCard
            href="/sdks/python"
            title="Python SDK"
            icon="P"
            body="GovernedToolSet for LangGraph, LangChain, CrewAI, OpenAI Agents. ToolDeniedException with the structured denial payload."
          />
          <HomeCard
            href="/sdks/typescript"
            title="TypeScript SDK"
            icon="T"
            body="governedTools() for Mastra, the Vercel AI SDK, LangGraph.js, and OpenAI Agents JS. Works in Node, Workers, and Lambda."
          />
        </HomeGrid>
      </HomeSection>

      <HomeSection label="Operate" intro="Production posture, evidence, and the hosted control plane.">
        <HomeGrid cols={2}>
          <HomeCard
            href="/security"
            title="Security model"
            icon="⛨"
            body="Threats, guarantees, and explicit limits. Per-environment posture matrix for local, staging, production, and air-gapped."
          />
          <HomeCard
            href="/errors"
            title="Denial codes"
            icon="!"
            body="Structured payloads for POLICY_DENY, POLICY_DEFER, RATE_EXCEEDED, BUDGET_EXCEEDED, COMPLETION_BLOCKED, and the rest."
          />
          <HomeCard
            href="/registry"
            title="Registry"
            icon="⊟"
            body="Signed, pinned distribution of providers, policy packs, and framework profiles. Trust roots, bundle export, self-host."
          />
          <HomeCard
            href="/cloud"
            title="Faramesh Cloud"
            icon="☁"
            body="Fleet visibility, the approvals UI, the DPR replica, compliance reporting. Never in the enforcement path."
          />
        </HomeGrid>
      </HomeSection>

      <HomeSection
        label="Use cases"
        intro="Production patterns we see most often. Full policy snippets for each."
        footer={
          <Link href="/use-cases" className="text-fd-primary no-underline hover:underline">
            See every pattern →
          </Link>
        }
      >
        <HomeGrid cols={3}>
          <HomeCard
            href="/use-cases#1-payments-and-money-movement"
            title="Payments agents"
            body="Hard dollar ceilings, redacted card data, human approval over a threshold."
          />
          <HomeCard
            href="/use-cases#3-coding-agents"
            title="Coding agents"
            body="Read everything, edit source, never run shell exec or git force-push."
          />
          <HomeCard
            href="/use-cases#2-customer-support-agents"
            title="Customer support"
            body="Email confined to your domain. Cancellations need a click."
          />
          <HomeCard
            href="/use-cases#6-multi-tenant-saas-agents"
            title="Multi-tenant SaaS"
            body="Cross-tenant access fails closed. Every violation pages on-call."
          />
          <HomeCard
            href="/use-cases#7-regulated-workloads-hipaa-soc-2-pci"
            title="Regulated workloads"
            body="KMS-signed evidence, redaction by default, auditor-ready exports."
          />
          <HomeCard
            href="/use-cases#8-autonomous-web-agents"
            title="Autonomous web agents"
            body="Bounded crawl, no uploads without approval, daily browsing budget."
          />
        </HomeGrid>
      </HomeSection>
    </div>
  );
}
