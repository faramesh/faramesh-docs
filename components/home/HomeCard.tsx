import Link from 'next/link';
import type { ReactNode } from 'react';

type HomeCardProps = {
  href: string;
  title: string;
  body?: string;
  icon?: ReactNode;
  accent?: boolean;
  bullets?: string[];
};

export function HomeCard({ href, title, body, icon, accent, bullets }: HomeCardProps) {
  return (
    <Link
      href={href}
      className={[
        'flex flex-col gap-2 rounded-lg border p-4 no-underline transition-colors',
        accent
          ? 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15'
          : 'border-fd-border bg-fd-card hover:bg-fd-accent/10',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        {icon ? (
          <span className="inline-grid size-7 shrink-0 place-items-center rounded-md bg-fd-primary/15 text-sm font-bold text-fd-primary">
            {icon}
          </span>
        ) : null}
        <h3 className="m-0 text-base font-semibold text-fd-foreground">{title}</h3>
      </div>
      {body ? <p className="m-0 text-sm text-fd-muted-foreground leading-relaxed">{body}</p> : null}
      {bullets?.length ? (
        <ul className="m-0 list-disc pl-4 text-sm text-fd-muted-foreground leading-relaxed">
          {bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </Link>
  );
}
