import { cn } from '@tnsi/ui';

interface MethodChapterHeadingProps {
  id?: string;
  title: string;
  /** `section` ≈ 38–52px, `major` ≈ 48–72px — both fluid via clamp(). */
  size?: 'section' | 'major';
  className?: string;
}

const sizeClasses = {
  section: 'text-[clamp(2.375rem,4.4vw,3.25rem)] leading-[1.08]',
  major: 'text-[clamp(2.75rem,5.6vw,4.5rem)] leading-[1.04]',
} as const;

/**
 * The chapter heading used across the Human Expansion Theory™ page: the same
 * hairline-over-heading grammar as `ChapterMarker` (which no longer renders
 * numerals, per the 2026-09 revision feedback), but with a fluid type scale
 * `ChapterMarker`'s fixed sizes can't express. Always an `h2`.
 */
export function MethodChapterHeading({
  id,
  title,
  size = 'section',
  className,
}: MethodChapterHeadingProps) {
  return (
    <div className={cn('flex flex-col gap-(--space-md)', className)}>
      <div className="border-border border-t" aria-hidden />
      <h2
        id={id}
        className={cn(
          'font-heading text-foreground font-semibold tracking-tight text-balance',
          sizeClasses[size],
        )}
      >
        {title}
      </h2>
    </div>
  );
}
