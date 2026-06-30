import NextLink from 'next/link';

export interface TopicChipProps {
  label: string;
  href: string;
}

export function TopicChip({ label, href }: TopicChipProps) {
  return (
    <NextLink
      href={href}
      className="border-border text-foreground hover:bg-secondary/60 inline-flex items-center rounded-full border px-(--space-lg) py-(--space-sm) text-sm font-medium tracking-wide transition-colors"
    >
      {label}
    </NextLink>
  );
}
