import { siteUrl } from '@/lib/shared';

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Faramesh',
  url: 'https://faramesh.dev',
  sameAs: [
    'https://github.com/faramesh/faramesh-core',
    'https://github.com/faramesh/faramesh-registry',
  ],
};

const software = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Faramesh',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Linux, macOS, Windows',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: siteUrl,
  description:
    'Pre-execution governance for AI agents: policy engine, MCP and HTTP proxies, SDK shim, tamper-evident audit WAL.',
};

export function StructuredData() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(software) }}
      />
    </>
  );
}
