import { Inter } from 'next/font/google';
import { Provider } from '@/components/provider';
import './global.css';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata = {
  title: {
    default: 'Faramesh Docs',
    template: '%s | Faramesh Docs',
  },
  description:
    'Non-bypassable execution control for AI agents. Policy engine, agent identity, credential sequestration, and human-in-the-loop approvals.',
  metadataBase: new URL('https://docs.faramesh.dev'),
  icons: {
    icon: '/faramesh-icon-primary-white.svg',
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
