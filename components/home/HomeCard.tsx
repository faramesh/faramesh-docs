import Link from 'next/link';
import type { ReactNode } from 'react';

type Accent = 'teal' | 'amber' | 'violet' | 'slate' | 'rose';

type HomeCardProps = {
  href: string;
  title: string;
  body?: string;
  icon?: ReactNode;
  accent?: Accent;
  featured?: boolean;
  layout?: 'vertical' | 'horizontal';
  meta?: string;
};

const accentBorder: Record<Accent, string> = {
  teal: 'border-l-teal-500',
  amber: 'border-l-amber-500',
  violet: 'border-l-violet-500',
  slate: 'border-l-slate-400',
  rose: 'border-l-rose-500',
};

export function HomeCard({
  href,
  title,
  body,
  icon,
  accent = 'slate',
  featured = false,
  layout = 'vertical',
  meta,
}: HomeCardProps) {
  const base =
    'group no-underline transition-colors hover:bg-fd-accent/5 border border-fd-border bg-fd-card';

  if (layout === 'horizontal') {
    return (
      <Link
        href={href}
        className={`${base} flex items-start gap-4 rounded-sm border-l-4 ${accentBorder[accent]} p-4`}
      >
        {icon ? (
          <span className="inline-grid size-9 shrink-0 place-items-center rounded-sm bg-fd-muted/80 font-mono text-sm text-fd-foreground">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          {meta ? (
            <span className="font-mono text-[0.65rem] uppercase tracking-wider text-fd-muted-foreground">
              {meta}
            </span>
          ) : null}
          <h3 className="m-0 text-[15px] font-semibold text-fd-foreground group-hover:text-teal-700 dark:group-hover:text-teal-300">
            {title}
          </h3>
          {body ? (
            <p className="m-0 mt-1 text-sm leading-relaxed text-fd-muted-foreground">{body}</p>
          ) : null}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={[
        base,
        'flex flex-col gap-2 rounded-sm border-l-4 p-4',
        accentBorder[accent],
        featured ? 'min-h-[140px] bg-gradient-to-br from-fd-card to-fd-muted/20' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        {icon ? (
          <span className="inline-grid size-7 shrink-0 place-items-center rounded-sm bg-fd-muted font-mono text-xs text-fd-foreground">
            {icon}
          </span>
        ) : null}
        <h3 className="m-0 text-[15px] font-semibold text-fd-foreground">{title}</h3>
      </div>
      {body ? (
        <p className="m-0 text-sm leading-relaxed text-fd-muted-foreground">{body}</p>
      ) : null}
    </Link>
  );
}
