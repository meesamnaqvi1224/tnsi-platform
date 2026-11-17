import * as React from 'react';
import NextLink from 'next/link';
import { Moon, NotebookPen, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import { cn } from '@tnsi/ui';

/**
 * Presentational pieces for the membership page. Nothing here fetches or
 * decides anything: the page passes real values in (a day count from the
 * server's trial end, counts from the member's own practice records, practices
 * from the published library) and these only draw them.
 */

export type Tint = 'sage' | 'dusk' | 'sand' | 'clay' | 'mist';

/**
 * One soft colour per kind of content, used the same way everywhere on the
 * page (card, tag, chip, tile) so the page reads as one system. The values
 * live on the page wrapper as `--m-*` custom properties (see `tintStyle`).
 * Class names are written out in full so Tailwind can see them.
 */
export const TINT_CLASSES: Record<Tint, { card: string; chip: string; tag: string }> = {
  sage: {
    card: 'bg-(--m-sage-bg) border-(--m-sage-bd)',
    chip: 'bg-(--m-sage-bd) text-(--m-sage-ink)',
    tag: 'bg-(--m-sage-bd) text-(--m-sage-ink)',
  },
  dusk: {
    card: 'bg-(--m-dusk-bg) border-(--m-dusk-bd)',
    chip: 'bg-(--m-dusk-bd) text-(--m-dusk-ink)',
    tag: 'bg-(--m-dusk-bd) text-(--m-dusk-ink)',
  },
  sand: {
    card: 'bg-(--m-sand-bg) border-(--m-sand-bd)',
    chip: 'bg-(--m-sand-bd) text-(--m-sand-ink)',
    tag: 'bg-(--m-sand-bd) text-(--m-sand-ink)',
  },
  clay: {
    card: 'bg-(--m-clay-bg) border-(--m-clay-bd)',
    chip: 'bg-(--m-clay-bd) text-(--m-clay-ink)',
    tag: 'bg-(--m-clay-bd) text-(--m-clay-ink)',
  },
  mist: {
    card: 'bg-(--m-mist-bg) border-(--m-mist-bd)',
    chip: 'bg-(--m-mist-bd) text-(--m-mist-ink)',
    tag: 'bg-(--m-mist-bd) text-(--m-mist-ink)',
  },
};

/** The tint custom properties, set once on the page wrapper. Muted, low-chroma tones that sit with the bronze accent. */
export const tintStyle = {
  '--m-sage-bg': 'oklch(0.93 0.02 155)',
  '--m-sage-bd': 'oklch(0.86 0.03 155)',
  '--m-sage-ink': 'oklch(0.33 0.05 155)',
  '--m-dusk-bg': 'oklch(0.92 0.02 295)',
  '--m-dusk-bd': 'oklch(0.86 0.04 295)',
  '--m-dusk-ink': 'oklch(0.31 0.07 290)',
  '--m-sand-bg': 'oklch(0.93 0.04 85)',
  '--m-sand-bd': 'oklch(0.86 0.06 85)',
  '--m-sand-ink': 'oklch(0.38 0.07 80)',
  '--m-clay-bg': 'oklch(0.9 0.03 50)',
  '--m-clay-bd': 'oklch(0.84 0.05 50)',
  '--m-clay-ink': 'oklch(0.35 0.07 45)',
  '--m-mist-bg': 'oklch(0.93 0.015 235)',
  '--m-mist-bd': 'oklch(0.86 0.03 235)',
  '--m-mist-ink': 'oklch(0.32 0.05 240)',
} as React.CSSProperties;

/** Tint cards for a content type; anything unknown falls back to sand. */
export function tintForContentType(contentType: string): Tint {
  if (contentType === 'interactive') return 'sage';
  if (contentType === 'audio') return 'dusk';
  if (contentType === 'text') return 'clay';
  return 'sand';
}

/** A day-by-day dial: one tick per trial day, the days reached drawn in gold. */
export function TrialRing({ day, total }: { day: number; total: number }) {
  const reached = Math.min(Math.max(day, 1), total);
  return (
    <div
      role="img"
      aria-label={`Day ${reached} of ${total}`}
      className="relative size-32 shrink-0 sm:size-36"
    >
      <svg viewBox="0 0 132 132" aria-hidden className="size-full">
        {Array.from({ length: total }, (_, index) => (
          <line
            key={index}
            x1="66"
            y1="6"
            x2="66"
            y2="17"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${(index * 360) / total} 66 66)`}
            className={index < reached ? 'stroke-(--membership-gold)' : 'stroke-foreground/20'}
          />
        ))}
      </svg>
      <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading text-3xl leading-none font-semibold lining-nums">
          {reached}
        </span>
        <span className="text-foreground/70 mt-1 text-xs">of {total} days</span>
      </div>
    </div>
  );
}

export function StatTile({ tint, label, value }: { tint: Tint; label: string; value: number }) {
  return (
    <div className={cn('rounded-xl border px-4 py-3', TINT_CLASSES[tint].card)}>
      <p className="text-foreground/70 text-sm">{label}</p>
      <p className="font-heading mt-0.5 text-3xl leading-tight font-semibold lining-nums">
        {value}
      </p>
    </div>
  );
}

/** A ground colour with a line motif centred on it, never cropped: the motif is always whole, whatever the card's width. */
function ArtFrame({
  ground,
  compact,
  children,
}: {
  ground: string;
  compact: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={compact ? 'h-20 w-full' : 'h-28 w-full'}
      style={{ background: ground }}
    >
      <svg viewBox="0 0 160 84" preserveAspectRatio="xMidYMid meet" className="block h-full w-full">
        {children}
      </svg>
    </div>
  );
}

/** Abstract artwork in the brand's own shapes. Used until a practice has an approved thumbnail; never a stand-in for real content. */
export function PracticeArt({
  contentType,
  compact = false,
}: {
  contentType: string;
  compact?: boolean;
}) {
  if (contentType === 'interactive') {
    return (
      <ArtFrame ground="oklch(0.33 0.05 185)" compact={compact}>
        <g fill="none" stroke="oklch(0.78 0.1 80)" strokeWidth="1.2">
          <circle cx="80" cy="42" r="10" />
          <circle cx="80" cy="42" r="20" />
          <circle cx="80" cy="42" r="30" />
          <circle cx="80" cy="42" r="40" strokeDasharray="6 5" />
        </g>
      </ArtFrame>
    );
  }
  if (contentType === 'audio') {
    return (
      <ArtFrame ground="oklch(0.32 0.07 295)" compact={compact}>
        <g fill="none" stroke="oklch(0.9 0.03 85)" strokeWidth="1.4">
          <path d="M0 52 Q20 36 40 52 T80 52 T120 52 T160 52" />
          <path d="M0 62 Q20 46 40 62 T80 62 T120 62 T160 62" opacity=".6" />
          <path d="M0 72 Q20 56 40 72 T80 72 T120 72 T160 72" opacity=".35" />
        </g>
      </ArtFrame>
    );
  }
  return (
    <ArtFrame
      ground="linear-gradient(oklch(0.84 0.05 85) 66.6%, oklch(0.33 0.05 185) 66.6%)"
      compact={compact}
    >
      <circle cx="80" cy="34" r="16" fill="oklch(0.6 0.09 70)" />
    </ArtFrame>
  );
}

export interface StarterPractice {
  id: string;
  title: string;
  contentType: string;
  /** "Interactive", "Video", … */
  typeLabel: string;
}

/** Real published practices to begin with, each linking to its own page. */
export function StarterCards({ practices }: { practices: StarterPractice[] }) {
  if (practices.length === 0) return null;
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3">
      {practices.map((practice) => {
        const tint = tintForContentType(practice.contentType);
        return (
          <li key={practice.id} className="contents">
            <NextLink
              href={`/dashboard/practices/${practice.id}`}
              className={cn(
                'focus-visible:ring-ring group flex flex-col overflow-hidden rounded-xl border transition-transform focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-safe:hover:-translate-y-0.5',
                TINT_CLASSES[tint].card,
              )}
            >
              <PracticeArt contentType={practice.contentType} />
              <span className="flex flex-col items-start gap-2 px-4 py-3.5">
                <span
                  className={cn(
                    'rounded-md px-2 py-0.5 text-xs font-medium',
                    TINT_CLASSES[tint].tag,
                  )}
                >
                  {practice.typeLabel}
                </span>
                <span className="font-heading text-lg leading-snug font-semibold">
                  {practice.title}
                </span>
              </span>
            </NextLink>
          </li>
        );
      })}
    </ul>
  );
}

interface IncludeGroup {
  title: string;
  tint: Tint;
  Icon: LucideIcon;
  items: readonly string[];
}

/**
 * The twelve approved membership inclusions (verbatim from Membership &
 * Commercial Model v1) arranged in four groups. Every approved line appears
 * exactly once; only the grouping and its headings are presentational.
 */
const INCLUDE_GROUPS: readonly IncludeGroup[] = [
  {
    title: 'Practice library',
    tint: 'sage',
    Icon: Sparkles,
    items: [
      'Full Practice Library',
      'Guided nervous-system exercises',
      'Somatic practices',
      'Body-based practices',
    ],
  },
  {
    title: 'PowerDrops and support',
    tint: 'dusk',
    Icon: Zap,
    items: ['Full PowerDrops™', 'State-based support'],
  },
  {
    title: 'Meditation and learning',
    tint: 'sand',
    Icon: Moon,
    items: [
      'Meditation & visualisation',
      'Educational resources',
      'Ongoing additions to the library',
    ],
  },
  {
    title: 'Reflection and progress',
    tint: 'clay',
    Icon: NotebookPen,
    items: ['Reflective tools', 'Practice history', 'Progress'],
  },
];

export function IncludeGroups({ labelledBy }: { labelledBy: string }) {
  return (
    <div
      aria-labelledby={labelledBy}
      role="group"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {INCLUDE_GROUPS.map(({ title, tint, Icon, items }) => (
        <section key={title} className={cn('rounded-xl border p-4', TINT_CLASSES[tint].card)}>
          <div className="mb-3 flex items-center gap-3">
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-[0.65rem]',
                TINT_CLASSES[tint].chip,
              )}
            >
              <Icon aria-hidden className="size-5" />
            </span>
            <h3 className="font-heading text-lg leading-tight font-semibold">{title}</h3>
          </div>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-base">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Deep ground colour and a simple line motif for each tint, so a practice's artwork follows its condition. */
const CARD_ART: Record<Tint, { ground: string; motif: React.ReactNode }> = {
  sage: {
    ground: 'oklch(0.33 0.05 185)',
    motif: (
      <g fill="none" stroke="oklch(0.78 0.1 80)" strokeWidth="1.3">
        <path d="M20 62 H140" />
        <path d="M40 62 Q80 10 120 62" />
        <path d="M58 62 Q80 30 102 62" />
      </g>
    ),
  },
  dusk: {
    ground: 'oklch(0.32 0.07 295)',
    motif: (
      <g fill="none" stroke="oklch(0.9 0.03 85)" strokeWidth="1.3">
        <path d="M10 64 L60 22 L84 42 L110 16 L150 64 Z" />
      </g>
    ),
  },
  sand: {
    ground: 'oklch(0.38 0.06 80)',
    motif: (
      <g fill="none" stroke="oklch(0.88 0.06 85)" strokeWidth="1.3">
        <path d="M30 66 L30 26 M30 36 L22 28 M30 44 L38 36" />
        <path d="M80 66 L80 18 M80 32 L70 22 M80 42 L90 32" />
        <path d="M130 66 L130 28 M130 38 L122 30 M130 46 L138 38" />
      </g>
    ),
  },
  clay: {
    ground: 'oklch(0.4 0.08 45)',
    motif: (
      <g fill="none" stroke="oklch(0.85 0.07 60)" strokeWidth="1.3">
        <path d="M80 64 L80 30" />
        <path d="M80 42 Q64 36 58 24" />
        <path d="M80 38 Q96 32 104 20" />
        <circle cx="80" cy="20" r="5" />
      </g>
    ),
  },
  mist: {
    ground: 'oklch(0.34 0.05 240)',
    motif: (
      <g fill="none" stroke="oklch(0.88 0.04 235)" strokeWidth="1.3">
        <circle cx="80" cy="36" r="8" />
        <circle cx="80" cy="36" r="17" />
        <circle cx="80" cy="36" r="26" />
      </g>
    ),
  },
};

/** The artwork band on a practice card: interactive practices keep their rings, others follow their condition's tint. */
export function CardArt({ contentType, tint }: { contentType: string; tint: Tint | null }) {
  if (contentType === 'interactive' || tint === null) {
    return <PracticeArt contentType={contentType} compact />;
  }
  const { ground, motif } = CARD_ART[tint];
  return (
    <ArtFrame ground={ground} compact>
      {motif}
    </ArtFrame>
  );
}

/** A small square of artwork for a timeline entry: a practice follows its type, a check-in is a soft sand tile. */
export function ThumbArt({ kind }: { kind: string }) {
  const frame = 'size-16 shrink-0 overflow-hidden rounded-[0.65rem] sm:size-[4.25rem]';
  if (kind === 'check_in') {
    return (
      <div aria-hidden className={frame} style={{ background: 'oklch(0.86 0.06 85)' }}>
        <svg viewBox="0 0 68 68" className="block size-full">
          <g fill="none" stroke="oklch(0.5 0.08 75)" strokeWidth="1.4">
            <circle cx="34" cy="34" r="6" />
            <circle cx="34" cy="34" r="13" opacity=".7" />
            <circle cx="34" cy="34" r="20" opacity=".4" />
          </g>
        </svg>
      </div>
    );
  }
  if (kind === 'interactive') {
    return (
      <div aria-hidden className={frame} style={{ background: 'oklch(0.33 0.05 185)' }}>
        <svg viewBox="0 0 68 68" className="block size-full">
          <g fill="none" stroke="oklch(0.78 0.1 80)" strokeWidth="1.2">
            <circle cx="34" cy="34" r="6" />
            <circle cx="34" cy="34" r="12" />
            <circle cx="34" cy="34" r="18" />
            <circle cx="34" cy="34" r="25" strokeDasharray="4 3" />
          </g>
        </svg>
      </div>
    );
  }
  if (kind === 'audio') {
    return (
      <div aria-hidden className={frame} style={{ background: 'oklch(0.32 0.07 295)' }}>
        <svg viewBox="0 0 68 68" className="block size-full">
          <g fill="none" stroke="oklch(0.9 0.03 85)" strokeWidth="1.4">
            <path d="M0 30 Q9 20 17 30 T34 30 T51 30 T68 30" />
            <path d="M0 40 Q9 30 17 40 T34 40 T51 40 T68 40" opacity=".6" />
            <path d="M0 50 Q9 40 17 50 T34 50 T51 50 T68 50" opacity=".35" />
          </g>
        </svg>
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className={frame}
      style={{
        background: 'linear-gradient(oklch(0.84 0.05 85) 62%, oklch(0.33 0.05 185) 62%)',
      }}
    >
      <svg viewBox="0 0 68 68" className="block size-full">
        <circle cx="34" cy="28" r="12" fill="oklch(0.6 0.09 70)" />
      </svg>
    </div>
  );
}
