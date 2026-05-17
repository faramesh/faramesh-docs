import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';
import { createDocMetadata } from '@/lib/metadata';
import { siteUrl } from '@/lib/shared';

export const metadata = createDocMetadata({
  title: 'Faramesh Docs',
  description:
    'Governance as code for AI agents — policy, identity, credential brokering, and audit trails.',
  path: '/',
  ogImage: `${siteUrl}/docs-cover.png`,
});

export default function Layout({ children }: LayoutProps<'/'>) {
  return <HomeLayout {...baseOptions()}>{children}</HomeLayout>;
}
