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
    <header className="mb-12 grid gap-8 border-b border-fd-border pb-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div className="grid gap-4">
        <span className="w-fit border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-teal-700 dark:text-teal-300">
          {eyebrow}
        </span>
        <h1 className="m-0 max-w-xl text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-fd-foreground md:text-[2.25rem]">
          {title}
        </h1>
        <p className="m-0 max-w-lg text-[15px] leading-relaxed text-fd-muted-foreground">
          {body}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href={primaryHref}
            className="inline-flex items-center rounded-sm bg-teal-600 px-4 py-2 text-sm font-medium text-white no-underline transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400"
          >
            {primaryLabel}
          </Link>
          <Link
            href={secondaryHref}
            className="inline-flex items-center rounded-sm border border-fd-border bg-fd-card px-4 py-2 text-sm font-medium text-fd-foreground no-underline transition-colors hover:border-fd-primary/40"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>

      <div className="border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.06] to-fd-card p-4 shadow-sm">
        <p className="m-0 mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
          Install
        </p>
        <pre className="m-0 overflow-x-auto rounded-sm border border-fd-border bg-fd-background p-3 font-mono text-[12px] leading-relaxed text-fd-foreground">
{`curl -fsSL \\
  raw.githubusercontent.com/faramesh/faramesh-core/main/install.sh | bash
faramesh version`}
        </pre>
        <p className="mb-0 mt-3 text-xs text-fd-muted-foreground">
          Also: Homebrew, npx, Go install, or build from git.{' '}
          <Link href="/quickstart#install-the-cli" className="text-teal-600 no-underline hover:underline dark:text-teal-400">
            All install paths
          </Link>
        </p>
      </div>
    </header>
  );
}
