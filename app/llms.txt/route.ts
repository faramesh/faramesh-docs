import { source } from '@/lib/source';
import { llms } from 'fumadocs-core/source';
import { siteUrl } from '@/lib/shared';

export const revalidate = false;

export function GET() {
  const index = llms(source).index();
  const pages = source
    .getPages()
    .map((p) => `- ${p.data.title}: ${siteUrl}${p.url}`)
    .join('\n');
  const body = [
    '# Faramesh Documentation (llms.txt)',
    '# Product: pre-execution governance for AI agents. Policy engine, MCP/HTTP proxy, SDK shim, audit WAL.',
    `# Canonical site: ${siteUrl}`,
    `# Full corpus (plain text): ${siteUrl}/llms-full.txt`,
    `# Sitemap: ${siteUrl}/sitemap.xml`,
    '',
    index,
    '',
    '# All documentation pages',
    pages,
  ].join('\n');
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
