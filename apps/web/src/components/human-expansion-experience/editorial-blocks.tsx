import type * as React from 'react';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';
import type { BlockId } from './editorial-config';

/**
 * The existing Human Expansion Theory™ content, set as editorial blocks. All
 * words come from `content/human-expansion-theory.ts`; nothing is written,
 * shortened or renamed here. Blocks know nothing about scroll: they read two
 * CSS variables their parent sets (`--reveal`, and `--a` / `--lit` for the
 * conditions), so the same markup works in the sticky scene and in the plain
 * linear fallback (where the variables simply default to fully revealed).
 */

const c = humanExpansionTheoryContent;

/** Staggered reveal: fades up as `--reveal` passes `d`. Pure CSS, so there is no per-element JS. */
function Rv({
  d = 0,
  className,
  children,
  as: Tag = 'div',
  ...rest
}: {
  d?: number;
  className?: string;
  children: React.ReactNode;
  as?: 'div' | 'p' | 'h1' | 'h2' | 'h3';
} & React.HTMLAttributes<HTMLElement>) {
  const t = `clamp(0, calc((var(--reveal, 1) - ${d}) * 5), 1)`;
  return (
    <Tag
      className={className}
      style={{ opacity: t, transform: `translateY(calc((1 - ${t}) * 14px))` }}
      {...(rest as object)}
    >
      {children}
    </Tag>
  );
}

const eyebrow = 'font-mono text-[0.68rem] tracking-[0.25em] uppercase text-(--he-muted)';
const h1 =
  'font-heading text-[clamp(2.4rem,4.6vw,4.25rem)] leading-[1.02] font-semibold tracking-tight text-(--he-text) text-balance';
const h2 =
  'font-heading text-[clamp(1.5rem,2.2vw,2.15rem)] leading-[1.1] font-semibold tracking-tight text-(--he-text) text-balance max-md:text-[1.35rem]';
const term =
  'font-heading text-[clamp(1.7rem,2.6vw,2.5rem)] leading-[1.05] font-semibold tracking-tight text-(--he-text) max-md:text-[1.3rem]';
const body =
  'text-[0.95rem] leading-[1.7] text-(--he-muted) max-md:text-[0.84rem] max-md:leading-[1.55]';
const lead =
  'font-heading text-[clamp(1.15rem,1.6vw,1.5rem)] leading-[1.3] font-medium text-(--he-text) max-md:text-[1.05rem]';
const stack = 'flex flex-col gap-[1.1rem] max-md:gap-[0.7rem]';

export function IntroBlock() {
  return (
    <div className={stack}>
      <Rv d={0} className={eyebrow}>
        {c.hero.eyebrow}
      </Rv>
      <Rv d={0.06} as="h1" className={h1}>
        {c.hero.headline}
      </Rv>
      <Rv d={0.14} as="p" className={`${body} max-w-[22rem]`}>
        {c.hero.tagline}
      </Rv>
      <Rv d={0.22}>
        <a
          href={c.hero.cta.href}
          className="pointer-events-auto inline-block border-b border-(--he-line)/60 pb-1 font-mono text-[0.72rem] tracking-[0.2em] text-(--he-text) uppercase transition-colors hover:border-(--he-line)"
        >
          {c.hero.cta.label}
        </a>
      </Rv>
    </div>
  );
}

export function WhyBlock() {
  return (
    <div className={stack}>
      <Rv d={0} as="h2" className={h2} data-anchor>
        {c.whyNewFramework.heading}
      </Rv>
      {c.whyNewFramework.paragraphs.map((paragraph, i) => (
        <Rv key={paragraph} d={0.18 + i * 0.12} as="p" className={body}>
          {paragraph}
        </Rv>
      ))}
    </div>
  );
}

export function CentralBlock() {
  return (
    <div className={stack}>
      <Rv d={0} as="h2" className={h2} data-anchor>
        {c.centralProposition.heading}
      </Rv>
      <Rv d={0.2} as="p" className={lead}>
        {c.centralProposition.statement}
      </Rv>
      {c.centralProposition.paragraphs.map((paragraph, i) => (
        <Rv key={paragraph} d={0.4 + i * 0.14} as="p" className={body}>
          {paragraph}
        </Rv>
      ))}
    </div>
  );
}

export function ConditionsFrameBlock() {
  return (
    <div className={stack}>
      <Rv d={0} as="h2" className={h2}>
        {c.developmentalConditions.heading}
      </Rv>
      <Rv d={0.2} as="p" className={body}>
        {c.developmentalConditions.intro}
      </Rv>
    </div>
  );
}

/**
 * The five conditions as one quiet list. Each item reads `--a` (is it current),
 * and `--lit` (has it been reached), both set per item by the layer: the current
 * one opens with its description; reached ones stay softly present; ones not yet
 * reached are held invisible (their space is kept, so nothing jumps).
 */
export function ConditionsListBlock() {
  return (
    <ul className="m-0 flex list-none flex-col gap-[0.35rem] p-0">
      {c.developmentalConditions.items.map((item, i) => (
        <li
          key={item.title}
          data-cond-item={i}
          style={{ opacity: 'calc(0.5 * var(--lit, 1) + 0.5 * var(--a, 1))' }}
        >
          <h3 className={term} data-cond-anchor={i}>
            {item.title}
          </h3>
          <div
            style={{
              maxHeight: 'calc(var(--a, 1) * 10rem)',
              opacity: 'var(--a, 1)',
              overflow: 'hidden',
            }}
          >
            <p className={`${body} pt-[0.55rem] pb-[0.4rem]`}>{item.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProtectionFrameBlock() {
  return (
    <div className={stack}>
      <Rv d={0} as="h2" className={h2}>
        {c.protectionParticipation.heading}
      </Rv>
      <Rv d={0.2} as="p" className={body}>
        {c.protectionParticipation.intro}
      </Rv>
    </div>
  );
}

export function ProtectionTermBlock() {
  return (
    <div className={stack}>
      <Rv d={0} as="h3" className={term} data-anchor>
        {c.protectionParticipation.protection.title}
      </Rv>
      <Rv d={0.3} as="p" className={body}>
        {c.protectionParticipation.protection.description}
      </Rv>
    </div>
  );
}

export function ParticipationTermBlock() {
  return (
    <div className={stack}>
      <Rv d={0} as="h3" className={term} data-anchor>
        {c.protectionParticipation.participation.title}
      </Rv>
      <Rv d={0.3} as="p" className={body}>
        {c.protectionParticipation.participation.description}
      </Rv>
    </div>
  );
}

export function ProtectionClosingBlock() {
  return (
    <Rv as="p" className={lead}>
      {c.protectionParticipation.closing}
    </Rv>
  );
}

export function PracticeTextBlock() {
  return (
    <div className={stack}>
      <Rv d={0} as="h2" className={h2}>
        {c.theoryToPractice.heading}
      </Rv>
      {c.theoryToPractice.paragraphs.map((paragraph, i) => (
        <Rv key={paragraph} d={0.18 + i * 0.14} as="p" className={body}>
          {paragraph}
        </Rv>
      ))}
    </div>
  );
}

/** Where the pathway list divides in two for the phone layout (see `narrowParts` in the config). */
const PATHWAY_PART_STARTS = [0, 3] as const;

/**
 * One list, once, in the DOM. On the phone the single text area shows it in
 * two parts: each item carries its part (`data-part`) and its row within that
 * part (`--he-nr`), so the two parts occupy the same cells and trade places.
 */
export function PracticeListBlock() {
  const pathways = c.theoryToPractice.pathways;
  return (
    <ul className="he-pathways m-0 flex list-none flex-col gap-[1.15rem] p-0 max-md:gap-[0.7rem]">
      {pathways.map((pathway, i) => {
        const part = PATHWAY_PART_STARTS.filter((start) => i >= start).length - 1;
        return (
          <li
            key={pathway.title}
            data-part={part}
            style={{ '--he-nr': i - PATHWAY_PART_STARTS[part]! + 1 } as React.CSSProperties}
          >
            <Rv d={i * 0.17} className="flex flex-col gap-[0.3rem]">
              <h3
                className="font-heading text-[clamp(1.15rem,1.7vw,1.6rem)] leading-[1.15] font-semibold text-(--he-text) max-md:text-[1.15rem]"
                data-anchor={i === 0 ? true : undefined}
              >
                {pathway.title}
              </h3>
              <p className={body}>{pathway.description}</p>
            </Rv>
          </li>
        );
      })}
    </ul>
  );
}

export function EvolvingBlock() {
  return (
    <div className={stack}>
      <Rv d={0} as="h2" className={h2} data-anchor>
        {c.evolving.heading}
      </Rv>
      {c.evolving.paragraphs.map((paragraph, i) => (
        <Rv key={paragraph} d={0.2 + i * 0.18} as="p" className={body}>
          {paragraph}
        </Rv>
      ))}
    </div>
  );
}

export const BLOCK_COMPONENTS: Record<BlockId, () => React.JSX.Element> = {
  intro: IntroBlock,
  why: WhyBlock,
  central: CentralBlock,
  'conditions-frame': ConditionsFrameBlock,
  'conditions-list': ConditionsListBlock,
  'protection-frame': ProtectionFrameBlock,
  'protection-term': ProtectionTermBlock,
  'participation-term': ParticipationTermBlock,
  'protection-closing': ProtectionClosingBlock,
  'practice-text': PracticeTextBlock,
  'practice-list': PracticeListBlock,
  evolving: EvolvingBlock,
};
