import type { ReactNode } from 'react';

type HomeSectionProps = {
  label: string;
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function HomeSection({ label, intro, children, footer }: HomeSectionProps) {
  return (
    <section className="mt-10">
      <header className="mb-4 grid gap-1.5">
        <span className="w-fit rounded-full border border-fd-border bg-fd-card px-2.5 py-0.5 font-mono text-[0.7rem] font-medium uppercase tracking-wider text-fd-muted-foreground">
          {label}
        </span>
        {intro ? (
          <p className="m-0 max-w-3xl text-[15px] text-fd-muted-foreground leading-relaxed">
            {intro}
          </p>
        ) : null}
      </header>
      <div className="grid gap-3">{children}</div>
      {footer ? <div className="mt-4 text-sm font-medium">{footer}</div> : null}
    </section>
  );
}
