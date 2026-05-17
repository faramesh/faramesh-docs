export const docsSections = [
	{
		id: 'start',
		label: 'Start',
		href: '/',
		matches: ['/', '/quickstart/', '/flows/', '/dev/', '/use-cases/'],
		sidebar: [
			{
				label: 'START',
				items: [
					{ slug: 'index', label: 'Overview' },
					{ slug: 'quickstart' },
					{ slug: 'use-cases', label: 'Use cases' },
					{ slug: 'flows', label: 'Workflows' },
					{ slug: 'dev', label: 'Run locally' },
				],
			},
		],
	},
	{
		id: 'concepts',
		label: 'Concepts',
		href: '/concepts/how-it-works/',
		matches: ['/concepts/'],
		sidebar: [
			{
				label: 'CONCEPTS',
				items: [
					{ slug: 'concepts/how-it-works', label: 'How it works' },
					{ slug: 'concepts/enforcement' },
					{ slug: 'concepts/interception' },
					{ slug: 'concepts/auditing' },
					{ slug: 'concepts/credentials' },
				],
			},
		],
	},
	{
		id: 'reference',
		label: 'Reference',
		href: '/stack/',
		matches: ['/init/', '/stack/', '/fpl/', '/providers/', '/registry/', '/cli/'],
		sidebar: [
			{
				label: 'CONFIGURATION',
				items: [
					{ slug: 'init', label: 'faramesh init' },
					{ slug: 'stack', label: 'Stack file' },
					{ slug: 'fpl', label: 'FPL language' },
					{ slug: 'providers' },
				],
			},
			{
				label: 'PLATFORM',
				items: [
					{ slug: 'cli' },
					{ slug: 'registry' },
				],
			},
		],
	},
	{
		id: 'frameworks',
		label: 'Frameworks',
		href: '/frameworks/',
		matches: ['/frameworks/'],
		sidebar: [
			{
				label: 'FRAMEWORKS',
				items: [
					{ slug: 'frameworks', label: 'Overview' },
					{ slug: 'frameworks/langgraph' },
					{ slug: 'frameworks/langchain' },
					{ slug: 'frameworks/openai-agents' },
					{ slug: 'frameworks/crewai' },
					{ slug: 'frameworks/claude-code' },
					{ slug: 'frameworks/cursor' },
					{ slug: 'frameworks/bedrock' },
				],
			},
		],
	},
	{
		id: 'operations',
		label: 'Operations',
		href: '/security/',
		matches: ['/security/', '/errors/', '/limitations/', '/cloud/'],
		sidebar: [
			{
				label: 'OPERATIONS',
				items: [
					{ slug: 'security', label: 'Security model' },
					{ slug: 'errors', label: 'Denial codes' },
					{ slug: 'limitations' },
				],
			},
			{
				label: 'PLATFORM',
				items: [
					{ slug: 'cloud', label: 'Faramesh Cloud' },
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
