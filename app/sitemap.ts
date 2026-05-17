import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { siteUrl } from '@/lib/shared';

export const dynamic = 'force-static';

function pagePriority(url: string): number {
  if (url === '/' || url === '/quickstart' || url === '/introduction') return 1;
  if (url.startsWith('/cli/') || url === '/dev' || url === '/init') return 0.9;
  if (url.startsWith('/concepts/') || url === '/security') return 0.85;
  return 0.75;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    ...source.getPages().map((page) => ({
      url: `${siteUrl}${page.url}`,
      lastModified: now,
      changeFrequency: (page.url === '/quickstart' ? 'daily' : 'weekly') as const,
      priority: pagePriority(page.url),
    })),
  ];
}
