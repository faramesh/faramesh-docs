import Image from 'next/image';

const lightLogo = '/docs-logo-light.svg';
const darkLogo = '/logo-docs-dark.svg';

export function FarameshLogo({ height = 28 }: { height?: number }) {
  const width = Math.round(height * 4.6);

  return (
    <span className="inline-flex items-center">
      <Image
        src={lightLogo}
        alt="Faramesh Docs"
        width={width}
        height={height}
        className="dark:hidden"
        priority
      />
      <Image
        src={darkLogo}
        alt="Faramesh Docs"
        width={width}
        height={height}
        className="hidden dark:inline-block"
        priority
      />
    </span>
  );
}
