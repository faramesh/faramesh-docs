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
        title="Make every agent tool call a decision, not a hope."
        body="Declare what your AI agent is allowed to do in one file. A small daemon runs alongside it and decides — permit, defer, or deny — before each tool call. You get a tamper-evident audit trail by default. No SDK lock-in, no cloud required."
        primaryHref="/quickstart"
        primaryLabel="Get started in 5 min →"
        secondaryHref="/introduction"
        secondaryLabel="Why Faramesh"
      />

      <HomeSection
        label="New here? Start with the story"
        intro="Three short pages that take you from never-heard-of-it to a running governed agent."
      >
        <HomeGrid cols={3}>
          <HomeCard
            href="/introduction"
            title="1. Why Faramesh exists"
            icon="?"
            body="The problem in one paragraph. What you get, who it's for, and the one scene that explains everything: declare → enforce → record → review."
          />
          <HomeCard
            href="/quickstart"
            title="2. Run a governed agent"
            icon="▸"
            accent
            body="Install the CLI, run faramesh init, wire the SDK shim. You'll see your first permit, defer, and deny in under five minutes."
          />
          <HomeCard
            href="/concepts/how-it-works"
            title="3. The mental model"
            icon="◆"
            body="Where Faramesh sits, what runs on every call, and what it deliberately doesn't do. Read this before designing a deployment."
          />
        </HomeGrid>
      </HomeSection>

      <HomeSection
        label="Tutorials"
        intro="Step-by-step walkthroughs for common situations. Pick the one that matches what you're building."
        footer={
          <Link href="/guides/govern-a-langgraph-agent" className="text-fd-primary no-underline hover:underline">
            See all tutorials →
          </Link>
        }
      >
        <HomeGrid cols={2}>
          <HomeCard
            href="/guides/govern-a-langgraph-agent"
            title="Govern your first LangGraph agent"
            icon="①"
            body="Take an existing LangGraph agent, add governance, watch a deferred refund get approved by a human. No infra needed."
          />
          <HomeCard
            href="/guides/your-first-policy"
            title="Write your first policy"
            icon="②"
            body="Build a governance.fms from scratch — rules, budgets, redaction. Plain-English explanations of every line."
          />
          <HomeCard
            href="/guides/debugging-denials"
            title="Debug a denial"
            icon="③"
            body="Why was my call denied? A diagnostic walkthrough using faramesh explain, the WAL, and the structured denial payload."
          />
          <HomeCard
            href="/guides/from-dev-to-prod"
            title="From dev to production"
            icon="④"
            body="Move from in-process stubs to real Vault, SPIFFE, and KMS providers without changing a single rule."
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

      <HomeSection
        label="Concepts"
        intro="What's actually happening inside the daemon, in plain language. Read these in order if you're new."
        footer={
          <Link href="/concepts/architecture" className="text-fd-primary no-underline hover:underline">
            Full architecture →
          </Link>
        }
      >
        <HomeGrid cols={2}>
          <HomeCard
            href="/concepts/enforcement"
            title="Enforcement"
            icon="⊕"
            body="The decision pipeline, step by step. Same input, same decision — every time."
          />
          <HomeCard
            href="/concepts/interception"
            title="Interception"
            icon="⇆"
            body="How the call reaches the daemon: SDK shim, MCP proxy, or HTTP proxy. Pick one based on your runtime."
          />
          <HomeCard
            href="/concepts/architecture"
            title="Architecture & supervisor"
            icon="◆"
            body="Daemon lifecycle, the agent supervisor, OS-tier sandbox, and how everything fits together end to end."
          />
          <HomeCard
            href="/concepts/identity"
            title="Identity"
            icon="◉"
            body="SPIFFE/SVID and OIDC attestation. How the daemon knows which agent is calling — without trusting the agent."
          />
          <HomeCard
            href="/concepts/credentials"
            title="Credentials"
            icon="✱"
            body="Short-lived, scoped tokens minted at the call site. The agent never holds a long-lived secret."
          />
          <HomeCard
            href="/concepts/auditing"
            title="Auditing"
            icon="✓"
            body="Decision Provenance Records, hash-chained WAL, KMS signing. Tamper-evident by construction."
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
