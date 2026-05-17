import Link from 'next/link';

type HomeHeroProps = {
  eyebrow: string;
  title: string;
  body: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
};

export function HomeHero({
  eyebrow,
  title,
  body,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: HomeHeroProps) {
  return (
    <header className="mb-8 grid gap-4 pb-10">
      <span className="w-fit rounded-full border border-fd-primary/20 bg-fd-primary/5 px-2.5 py-0.5 font-mono text-[0.7rem] font-medium uppercase tracking-wider text-fd-primary/90">
        {eyebrow}
      </span>
      <h1 className="m-0 max-w-2xl text-3xl font-semibold tracking-tight text-fd-foreground md:text-4xl">
        {title}
      </h1>
      <p className="m-0 max-w-3xl text-base text-fd-muted-foreground leading-relaxed md:text-[17px]">
        {body}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          href={primaryHref}
          className="inline-flex items-center rounded-md bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground no-underline transition-colors hover:bg-fd-primary/90"
        >
          {primaryLabel}
        </Link>
        <Link
          href={secondaryHref}
          className="inline-flex items-center rounded-md border border-fd-border bg-fd-card px-4 py-2 text-sm font-medium text-fd-foreground no-underline transition-colors hover:bg-fd-accent/10"
        >
          {secondaryLabel}
        </Link>
      </div>
    </header>
  );
}
