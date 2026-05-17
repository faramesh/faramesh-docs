import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { docsSidebar } from './src/lib/docs-nav.js';

export default defineConfig({
	site: 'https://docs.faramesh.dev',
	integrations: [
		starlight({
			title: 'Faramesh Docs',
			description:
				'Non-bypassable execution control for AI agents. Policy engine, agent identity, credential sequestration, and human-in-the-loop approvals.',
			expressiveCode: {
				shiki: {
					langAlias: { fpl: 'hcl', fms: 'hcl' },
				},
			},
			logo: {
				light: './src/assets/docs-logo-light.svg',
				dark: './src/assets/logo-docs-dark-.svg',
				replacesTitle: true,
			},
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/faramesh/faramesh-docs' },
			],
			editLink: {
				baseUrl: 'https://github.com/faramesh/faramesh-docs/edit/main/',
			},
			components: {
				Header: './src/components/Header.astro',
				Head: './src/components/Head.astro',
				PageFrame: './src/components/PageFrame.astro',
				Sidebar: './src/components/Sidebar.astro',
				PageTitle: './src/components/PageTitle.astro',
			},
			customCss: ['./src/styles/custom.css'],
			favicon: '/faramesh-icon-primary-white.svg',
			head: [
				{
					tag: 'meta',
					attrs: { property: 'og:image', content: 'https://docs.faramesh.dev/docs-cover.png' },
				},
				{
					tag: 'meta',
					attrs: { name: 'twitter:image', content: 'https://docs.faramesh.dev/docs-cover.png' },
				},
				// Basic SEO defaults for docs site
				{
					tag: 'meta',
					attrs: { name: 'robots', content: 'index, follow' },
				},
			],
			sidebar: docsSidebar,
		}),
	],
});
