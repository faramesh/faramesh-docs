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
    index,
    '',
    '# All documentation pages',
    'For full text export (LLM-friendly), fetch:',
    `${siteUrl}/llms-full.txt`,
    '',
    pages,
  ].join('\n');
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
