import type { Metadata } from 'next';
import { appName, siteUrl } from './shared';

export const defaultDescription =
  'Non-bypassable execution control for AI agents. Policy engine, agent identity, credential sequestration, and human-in-the-loop approvals.';

export const defaultKeywords = [
  'Faramesh',
  'AI agents',
  'agent governance',
  'governance as code',
  'policy engine',
  'MCP proxy',
  'LangGraph',
  'FPL',
  'decision provenance',
];

const defaultOgImage = {
  url: '/docs-cover.png',
  width: 1200,
  height: 630,
  alt: 'Faramesh Docs',
};

export const rootMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description: defaultDescription,
  applicationName: 'Faramesh',
  authors: [{ name: 'Faramesh', url: 'https://faramesh.dev' }],
  creator: 'Faramesh',
  publisher: 'Faramesh',
  keywords: defaultKeywords,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: appName,
    title: appName,
    description: defaultDescription,
    images: [defaultOgImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: appName,
    description: defaultDescription,
    images: [defaultOgImage.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export function createDocMetadata({
  title,
  description,
  path,
  ogImage,
}: {
  title: string;
  description?: string;
  path: string;
  ogImage: string;
}): Metadata {
  const canonical = path === '/' ? siteUrl : `${siteUrl}${path}`;
  const desc = description ?? defaultDescription;
  const pageTitle = path === '/' ? appName : title;

  return {
    title,
    description: desc,
    alternates: {
      canonical,
    },
    openGraph: {
      type: path === '/' ? 'website' : 'article',
      locale: 'en_US',
      url: canonical,
      siteName: appName,
      title: pageTitle,
      description: desc,
      images: [
        {
          url: ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: desc,
      images: [ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`],
    },
  };
}
