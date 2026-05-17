import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { FarameshLogo } from '@/components/faramesh-logo';
import { gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <FarameshLogo />,
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
