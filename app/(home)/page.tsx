import Link from 'next/link';
import { HomeCard } from '@/components/home/HomeCard';
import { HomeGrid } from '@/components/home/HomeGrid';
import { HomeHero } from '@/components/home/HomeHero';
import { HomeSection } from '@/components/home/HomeSection';

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
      <HomeHero
        eyebrow="Faramesh"
        title="Every agent tool call is a policy decision."
        body="Declare permissions in governance.fms. A local daemon permits, defers, or denies each tool call before it runs. Decisions are hash-chained in a WAL. No SDK lock-in. No cloud required."
        primaryHref="/quickstart"
        primaryLabel="Quickstart"
        secondaryHref="/introduction"
        secondaryLabel="Why Faramesh"
      />

      <HomeSection label="Start here" intro="Three pages from install to a running governed agent.">
        <div className="grid gap-2 lg:grid-cols-3">
          <HomeCard
            href="/introduction"
            title="Why Faramesh"
            accent="teal"
            meta="5 min read"
            layout="horizontal"
            body="Problem, guarantees, and one worked refund scene."
          />
          <HomeCard
            href="/quickstart"
            title="Quickstart"
            accent="violet"
            featured
            meta="Copy-paste path"
            layout="horizontal"
            body="Install (curl, Homebrew, npx, Go, git), init, wire, dev, approve."
          />
          <HomeCard
            href="/concepts/how-it-works"
            title="How it works"
            accent="amber"
            meta="Mental model"
            layout="horizontal"
            body="Placement, decision pipeline, and what runs on every call."
          />
        </div>
      </HomeSection>

      <HomeSection
        label="Tutorials"
        variant="band"
        intro="Walkthroughs for common tasks."
        footer={
          <Link href="/guides/govern-a-langgraph-agent" className="text-teal-600 no-underline hover:underline dark:text-teal-400">
            All tutorials
          </Link>
        }
      >
        <HomeGrid cols={2}>
          <HomeCard
            href="/guides/govern-a-langgraph-agent"
            title="Govern a LangGraph agent"
            accent="teal"
            body="End-to-end: init, SDK shim, defer, approve."
          />
          <HomeCard
            href="/guides/your-first-policy"
            title="Write your first policy"
            accent="amber"
            body="Rules, budgets, rate limits, redaction."
          />
          <HomeCard
            href="/guides/debugging-denials"
            title="Debug a denial"
            accent="rose"
            body="faramesh explain, WAL, denial payloads."
          />
          <HomeCard
            href="/guides/from-dev-to-prod"
            title="Dev to production"
            accent="violet"
            body="Real Vault, SPIFFE, KMS without rule changes."
          />
        </HomeGrid>
      </HomeSection>

      <HomeSection label="Wire your runtime" intro="Pick the interception tier that matches the agent.">
        <div className="grid gap-2 md:grid-cols-3">
          <HomeCard
            href="/frameworks/langgraph"
            title="Native SDK"
            accent="teal"
            icon="SDK"
            body="LangGraph, LangChain, CrewAI, OpenAI Agents. One wrapper on the tool list."
          />
          <HomeCard
            href="/frameworks/claude-code"
            title="MCP proxy"
            accent="violet"
            icon="MCP"
            body="Claude Code, Cursor. Point MCP config at the proxy URL."
          />
          <HomeCard
            href="/frameworks/bedrock"
            title="HTTP proxy"
            accent="amber"
            icon="HTTP"
            body="Bedrock action groups and OpenAPI tool hosts."
          />
        </div>
      </HomeSection>

      <HomeSection
        label="Reference"
        footer={
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/cli" className="text-teal-600 no-underline hover:underline dark:text-teal-400">
              CLI
            </Link>
            <Link href="/fpl" className="text-teal-600 no-underline hover:underline dark:text-teal-400">
              FPL
            </Link>
            <Link href="/stack" className="text-teal-600 no-underline hover:underline dark:text-teal-400">
              Stack
            </Link>
          </span>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <HomeCard href="/cli" title="CLI" accent="slate" body="init, check, plan, apply, dev, audit." />
          <HomeCard href="/fpl" title="FPL" accent="slate" body="governance.fms grammar." />
          <HomeCard href="/sdks/python" title="Python SDK" accent="slate" body="GovernedToolSet." />
          <HomeCard href="/sdks/typescript" title="TypeScript SDK" accent="slate" body="governedTools()." />
        </div>
      </HomeSection>

      <HomeSection label="Operate">
        <HomeGrid cols={2}>
          <HomeCard
            href="/security"
            title="Security model"
            accent="rose"
            layout="horizontal"
            body="Threats, guarantees, posture by environment."
          />
          <HomeCard
            href="/registry/contributing"
            title="Registry contributions"
            accent="amber"
            layout="horizontal"
            body="Publish a policy pack in about 30 minutes."
          />
          <HomeCard
            href="/errors"
            title="Denial codes"
            accent="slate"
            layout="horizontal"
            body="POLICY_DENY, DEFER, RATE_EXCEEDED, and payloads."
          />
          <HomeCard
            href="/cloud"
            title="Faramesh Cloud"
            accent="violet"
            layout="horizontal"
            body="Fleet UI and approvals. Not in the enforcement path."
          />
        </HomeGrid>
      </HomeSection>
    </div>
  );
}
