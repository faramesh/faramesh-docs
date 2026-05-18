import type { ReactNode } from 'react';

type HomeSectionProps = {
  label: string;
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: 'default' | 'band';
};

export function HomeSection({
  label,
  intro,
  children,
  footer,
  variant = 'default',
}: HomeSectionProps) {
  const isBand = variant === 'band';

  return (
    <section
      className={
        isBand
          ? '-mx-4 mt-12 border-y border-fd-border bg-fd-muted/30 px-4 py-8 md:-mx-6 md:px-6'
          : 'mt-12'
      }
    >
      <header className="mb-5 grid gap-2">
        <span
          className={
            isBand
              ? 'font-mono text-[0.7rem] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300'
              : 'font-mono text-[0.7rem] font-semibold uppercase tracking-widest text-fd-muted-foreground'
          }
        >
          {label}
        </span>
        {intro ? (
          <p className="m-0 max-w-2xl text-[15px] leading-relaxed text-fd-muted-foreground">
            {intro}
          </p>
        ) : null}
      </header>
      <div className="grid gap-3">{children}</div>
      {footer ? <div className="mt-4 text-sm font-medium">{footer}</div> : null}
    </section>
  );
}
