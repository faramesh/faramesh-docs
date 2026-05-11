export const docsSections = [
	{
		id: 'getting-started',
		label: 'Getting Started',
		href: '/getting-started/introduction/',
		matches: ['/getting-started/', '/'],
		sidebar: [
			{
				label: 'OVERVIEW',
				items: [
					{ slug: 'getting-started/introduction' },
					{ slug: 'getting-started/quickstart' },
				],
			},
			{
				label: 'SETUP',
				items: [
					{ slug: 'getting-started/installation' },
					{ slug: 'getting-started/your-first-policy' },
				],
			},
		],
	},
	{
		id: 'concepts',
		label: 'Core Concepts',
		href: '/concepts/why-faramesh/',
		matches: ['/concepts/', '/architecture/', '/security/', '/advanced/'],
		sidebar: [
			{
				label: 'FOUNDATION',
				items: [
					{ slug: 'concepts/why-faramesh' },
					{ slug: 'concepts/action-authorization-boundary' },
					{ slug: 'concepts/zero-trust-execution' },
				],
			},
			{
				label: 'ENGINE',
				items: [
					{ slug: 'concepts/deterministic-canonicalization' },
					{ slug: 'concepts/policy-engine' },
					{ slug: 'concepts/risk-scoring' },
					{ slug: 'concepts/audit-ledger' },
				],
			},
			{
				label: 'ARCHITECTURE',
				items: [
					{ slug: 'architecture/overview' },
					{ slug: 'architecture/request-lifecycle' },
					{ slug: 'architecture/internals' },
					{ slug: 'architecture/canonicalization-deep-dive' },
					{ slug: 'architecture/policy-evaluation' },
					{ slug: 'architecture/storage-model' },
				],
			},
				{
					label: 'ADVANCED',
					items: [
						{ slug: 'advanced/delegation-grants' },
						{ slug: 'advanced/network-hardening' },
						{ slug: 'advanced/supply-chain-verification' },
					],
				},
			{
				label: 'SECURITY',
				items: [
					{ slug: 'security/threat-model' },
					{ slug: 'security/fail-closed' },
					{ slug: 'security/cryptographic-hashing' },
					{ slug: 'security/prompt-injection-defense' },
				],
			},
		],
	},
	{
		id: 'integrations',
		label: 'SDK & Integrations',
		href: '/integrations/python-sdk/',
		matches: ['/integrations/'],
		sidebar: [
			{
				label: 'SDK',
				items: [
					{ slug: 'integrations/python-sdk' },
					{ slug: 'integrations/nodejs-sdk' },
				],
			},
			{
				label: 'AGENT FRAMEWORKS',
				items: [
					{ slug: 'integrations/langchain' },
					{ slug: 'integrations/langchain-deep-dive' },
					{ slug: 'integrations/deep-agents-deep-dive' },
					{ slug: 'integrations/crewai' },
					{ slug: 'integrations/autogen' },
					{ slug: 'integrations/langgraph' },
					{ slug: 'integrations/llamaindex' },
					{ slug: 'integrations/mcp' },
					{ slug: 'integrations/mcp-governance' },
					{ slug: 'integrations/dspy' },
				],
			},
			{
				label: 'TOOLS',
				items: [{ slug: 'integrations/govern-your-own-tool' }],
			},
		],
	},
	{
		id: 'policies',
		label: 'Policies',
		href: '/policies/overview/',
		matches: ['/policies/', '/identity/', '/hitl/', '/deployment/'],
		sidebar: [
			{
				label: 'POLICY ENGINE',
				items: [
					{ slug: 'policies/overview' },
					{ slug: 'policies/yaml-schema' },
					{ slug: 'policies/rules-and-matching' },
					{ slug: 'policies/risk-levels' },
						{ slug: 'policies/policy-packs' },
						{ slug: 'policies/fpl-language' },
					{ slug: 'policies/advanced-conditions' },
				],
			},
			{
				label: 'IDENTITY',
				items: [
					{ slug: 'identity/agent-identities' },
					{ slug: 'identity/credential-sequestration' },
						{ slug: 'identity/spiffe-workload-identity' },
					{ slug: 'identity/rbac' },
					{ slug: 'identity/secrets-management' },
				],
			},
			{
				label: 'HUMAN-IN-THE-LOOP',
				items: [
					{ slug: 'hitl/overview' },
					{ slug: 'hitl/approval-workflows' },
					{ slug: 'hitl/slack-routing' },
					{ slug: 'hitl/email-routing' },
					{ slug: 'hitl/web-ui' },
				],
			},
			{
				label: 'DEPLOYMENT',
				items: [
					{ slug: 'deployment/self-hosted' },
					{ slug: 'deployment/docker-compose' },
					{ slug: 'deployment/kubernetes' },
					{ slug: 'deployment/configuration' },
					{ slug: 'deployment/production-setup' },
					{ slug: 'deployment/database' },
					{ slug: 'deployment/horizon' },
					{ slug: 'deployment/nexus' },
				],
			},
		],
	},
	{
		id: 'reference',
		label: 'Reference',
		href: '/reference/api/',
		matches: ['/reference/'],
		sidebar: [
			{
				label: 'API REFERENCE',
				items: [
					{ slug: 'reference/api' },
					{ slug: 'reference/policy-schema' },
					{ slug: 'reference/sdk-client' },
					{ slug: 'reference/cli' },
					{ slug: 'reference/environment-variables' },
				],
			},
		],
	},
];

export const headerSections = docsSections;

export const docsSidebar = docsSections.map(({ label, sidebar }) => ({
	label,
	items: sidebar,
}));

const pathMatchers = docsSections
	.filter((section) => Array.isArray(section.matches) && section.matches.length > 0)
	.flatMap((section) =>
		section.matches
			.filter((match) => match !== '/')
			.map((match) => ({ section, match })),
	)
	.sort((left, right) => right.match.length - left.match.length);

export function normalizePathname(pathname) {
	if (!pathname || pathname === '/') {
		return '/';
	}

	return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

export function getSectionForPath(pathname) {
	const normalizedPath = normalizePathname(pathname);
	const matched = pathMatchers.find(({ match }) => normalizedPath.startsWith(match));

	if (matched) {
		return matched.section;
	}

	return docsSections[0];
}

export function getSectionLabel(pathname) {
	return getSectionForPath(pathname).label.toUpperCase();
}