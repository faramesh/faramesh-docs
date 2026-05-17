import type { ReactNode } from 'react';

type HomeSectionProps = {
  label: string;
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function HomeSection({ label, intro, children, footer }: HomeSectionProps) {
  return (
    <section className="mt-8">
      <header className="mb-3 grid gap-1">
        <span className="w-fit rounded border border-fd-primary/30 bg-fd-primary/10 px-2 py-0.5 font-mono text-[0.7rem] font-semibold uppercase tracking-wider text-fd-primary">
          {label}
        </span>
        {intro ? <p className="m-0 max-w-3xl text-sm text-fd-muted-foreground">{intro}</p> : null}
      </header>
      <div className="grid gap-2">{children}</div>
      {footer ? <div className="mt-3 text-sm font-semibold">{footer}</div> : null}
    </section>
  );
}
