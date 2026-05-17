import { source } from '@/lib/source';
import { getLLMText } from '@/lib/source';
import { llms } from 'fumadocs-core/source';
import { siteUrl } from '@/lib/shared';

export const revalidate = false;

export async function GET() {
  const pages = source.getPages();
  const header = llms(source).index();
  const sections: string[] = [header, '', '# Full documentation export', ''];

  for (const page of pages) {
    const url = `${siteUrl}${page.url}`;
    sections.push(`## ${page.data.title}`, `URL: ${url}`, '');
    try {
      const text = await getLLMText(page);
      sections.push(text.trim(), '');
    } catch {
      sections.push(`(see ${url})`, '');
    }
  }

  return new Response(sections.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
