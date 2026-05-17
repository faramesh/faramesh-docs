import type { ReactNode } from 'react';

type HomeGridProps = {
  cols?: 2 | 3 | 4;
  children: ReactNode;
};

const colClass: Record<number, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

export function HomeGrid({ cols = 2, children }: HomeGridProps) {
  return <div className={`grid grid-cols-1 gap-2 ${colClass[cols]}`}>{children}</div>;
}
