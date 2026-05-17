export const docsSections = [
	{
		id: 'start',
		label: 'Start here',
		href: '/',
		matches: ['/', '/quickstart/', '/flows/'],
		sidebar: [
			{ label: 'START', items: [{ slug: 'index' }, { slug: 'quickstart' }, { slug: 'flows' }] },
		],
	},
	{
		id: 'reference',
		label: 'Reference',
		href: '/init/',
		matches: ['/init/', '/stack/', '/providers/', '/fpl/', '/cli/', '/registry/', '/dev/'],
		sidebar: [
			{
				label: 'REFERENCE',
				items: [
					{ slug: 'init' },
					{ slug: 'stack' },
					{ slug: 'providers' },
					{ slug: 'fpl' },
					{ slug: 'cli' },
					{ slug: 'registry' },
					{ slug: 'dev' },
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
					{ slug: 'frameworks' },
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
		matches: ['/security/', '/errors/', '/limitations/'],
		sidebar: [
			{
				label: 'OPERATIONS',
				items: [{ slug: 'security' }, { slug: 'errors' }, { slug: 'limitations' }],
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
