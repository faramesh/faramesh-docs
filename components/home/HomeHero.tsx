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
    <header className="mb-6 grid gap-3 border-b border-fd-border pb-8">
      <span className="w-fit rounded border border-fd-primary/30 bg-fd-primary/10 px-2 py-0.5 font-mono text-[0.7rem] font-semibold uppercase tracking-wider text-fd-primary">
        {eyebrow}
      </span>
      <h1 className="m-0 max-w-2xl text-3xl font-bold tracking-tight text-fd-foreground md:text-4xl">
        {title}
      </h1>
      <p className="m-0 max-w-3xl text-base text-fd-muted-foreground leading-relaxed">{body}</p>
      <div className="mt-1 flex flex-wrap gap-2">
        <Link
          href={primaryHref}
          className="inline-flex items-center rounded-md bg-fd-primary px-4 py-2 text-sm font-semibold text-fd-primary-foreground no-underline"
        >
          {primaryLabel}
        </Link>
        <Link
          href={secondaryHref}
          className="inline-flex items-center rounded-md border border-fd-border px-4 py-2 text-sm font-semibold text-fd-foreground no-underline hover:bg-fd-accent/10"
        >
          {secondaryLabel}
        </Link>
      </div>
    </header>
  );
}
