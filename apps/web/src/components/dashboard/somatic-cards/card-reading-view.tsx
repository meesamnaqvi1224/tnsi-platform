import type * as React from 'react';
import NextLink from 'next/link';
import { Badge, Divider, Heading, Text } from '@tnsi/ui';
import { ResponsiveImage } from '@/components/utility/responsive-image';
import type { ApiSomaticCardDetail } from '@/lib/somatic-card-api';

/**
 * The API's four ordered JSONB arrays carry their own explicit `order`
 * field per item precisely because array position is never guaranteed to
 * match it (see docs/TNSI_Somatic_Card_Read_API_v1.md §7 - the API
 * returns these arrays as synced, not re-sorted). Sorting by `order`
 * here, not by array index, is what "preserve the API order" actually
 * means for content stored this way.
 */
function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}

/**
 * Ordered practice steps - always an `<ol>` (order is meaningful, not
 * decorative), every step rendered regardless of count (never assumes
 * exactly 3), label rendered only when the step actually has one.
 * Exported separately from `CardReadingView` so it can be unit-tested in
 * isolation (order preservation, arbitrary step counts, optional labels)
 * without rendering the whole page - see `card-reading-view.test.tsx`.
 */
export function PracticeStepsList({ steps }: { steps: ApiSomaticCardDetail['practiceSteps'] }) {
  if (steps.length === 0) return null;
  return (
    <ol className="flex list-decimal flex-col gap-(--space-sm) pl-(--space-lg)">
      {sortByOrder(steps).map((step, i) => (
        <li key={`${step.order}-${i}`} className="text-foreground text-sm leading-[1.8]">
          {step.label ? <span className="font-medium">{step.label}: </span> : null}
          {step.instruction}
        </li>
      ))}
    </ol>
  );
}

/** Ordered "What to Notice" prompts - plain observations, never titled, order preserved from the API. */
export function WhatToNoticeList({ items }: { items: ApiSomaticCardDetail['whatToNotice'] }) {
  if (items.length === 0) return null;
  return (
    <ol className="flex list-decimal flex-col gap-(--space-xs) pl-(--space-lg)">
      {sortByOrder(items).map((item, i) => (
        <li key={`${item.order}-${i}`} className="text-foreground text-sm leading-[1.8]">
          {item.text}
        </li>
      ))}
    </ol>
  );
}

/** Ordered supporting images - never flattened with any other asset type, captions preserved when provided, alt text always rendered. */
export function SupportingImagesGallery({
  images,
}: {
  images: ApiSomaticCardDetail['supportingImages'];
}) {
  if (images.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-(--space-md) sm:grid-cols-3">
      {sortByOrder(images).map((img, i) => (
        <figure key={`${img.order}-${i}`} className="flex flex-col gap-(--space-2xs)">
          <div className="bg-secondary/40 relative aspect-square w-full overflow-hidden rounded-sm">
            <ResponsiveImage
              src={img.imageUrl}
              alt={img.imageAlt}
              fill
              sizes="(min-width: 640px) 33vw, 50vw"
              className="object-cover"
            />
          </div>
          {img.caption ? (
            <figcaption className="text-muted-foreground text-xs">{img.caption}</figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}

/** Ordered demonstration frames - preserves order, label, instruction, and alt text; never merged with supportingImages. */
export function DemonstrationSequenceGallery({
  frames,
}: {
  frames: ApiSomaticCardDetail['demonstrationSequence'];
}) {
  if (frames.length === 0) return null;
  return (
    <div className="flex flex-col gap-(--space-lg) sm:flex-row sm:flex-wrap">
      {sortByOrder(frames).map((frame, i) => (
        <figure
          key={`${frame.order}-${i}`}
          className="flex w-full flex-col gap-(--space-2xs) sm:w-[calc(50%-var(--space-lg)/2)]"
        >
          <div className="bg-secondary/40 relative aspect-[9/16] w-full overflow-hidden rounded-sm">
            <ResponsiveImage
              src={frame.imageUrl}
              alt={frame.imageAlt}
              fill
              sizes="(min-width: 640px) 25vw, 50vw"
              className="object-cover"
            />
          </div>
          {frame.label || frame.instruction ? (
            <figcaption className="flex flex-col gap-(--space-3xs)">
              {frame.label ? (
                <Text className="text-foreground text-sm font-medium">{frame.label}</Text>
              ) : null}
              {frame.instruction ? (
                <Text tone="muted" className="text-xs leading-[1.7]">
                  {frame.instruction}
                </Text>
              ) : null}
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}

function ContentSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-(--space-sm)">
      <Heading as="h2" size="xs" className="font-heading text-foreground text-base font-semibold">
        {heading}
      </Heading>
      {children}
    </section>
  );
}

/**
 * Pure presentational rendering of a single Card's full reading
 * experience - takes already-fetched API data as props, does no
 * fetching/auth of its own (see `/dashboard/somatic-cards/card/[cardSlug]/page.tsx`).
 *
 * Field order follows the milestone's required editorial hierarchy
 * exactly: Series context, Card number, Card title, Invitation, Purpose,
 * Description, Orientation, Practice, What to Notice, Gentle Note,
 * Anchor. Every section is conditionally rendered - only sections whose
 * content actually exists in the API response appear; nothing is
 * fabricated or shown as an empty shell. Wording is rendered exactly as
 * the API returns it - never rewritten, shortened, or clinically
 * expanded.
 *
 * The finished 9:16 card artwork is a prominent visual near the top of
 * the reading experience (Step 6), but it is never the only accessible
 * representation of the card's content - every structured field below it
 * is real, independently readable text.
 */
export function CardReadingView({ card }: { card: ApiSomaticCardDetail }) {
  return (
    <div className="flex flex-col gap-(--space-2xl)">
      <NextLink
        href={`/dashboard/somatic-cards/${card.series.slug}`}
        className="interaction-text-link-underline w-fit text-sm"
      >
        ← {card.series.title}
      </NextLink>

      <header className="flex flex-col gap-(--space-md)">
        <Badge variant="outline" className="w-fit">
          Card {card.cardNumber}
        </Badge>
        <Heading as="h1" size="xl">
          {card.title}
        </Heading>
      </header>

      {card.cardArtwork ? (
        <div className="bg-secondary/40 relative aspect-[9/16] w-full max-w-sm self-center overflow-hidden rounded-lg">
          <ResponsiveImage
            src={card.cardArtwork.url}
            alt={card.cardArtwork.alt}
            fill
            sizes="(min-width: 640px) 384px, 100vw"
            className="object-cover"
            priority
          />
        </div>
      ) : null}

      {card.heroImage ? (
        <div className="bg-secondary/40 relative aspect-video w-full overflow-hidden rounded-lg">
          <ResponsiveImage
            src={card.heroImage.url}
            alt={card.heroImage.alt}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
      ) : null}

      <Divider />

      <div className="flex flex-col gap-(--space-xl)">
        {card.invitation ? (
          <ContentSection heading="Invitation">
            <Text className="text-foreground text-base leading-[1.85]">{card.invitation}</Text>
          </ContentSection>
        ) : null}

        {card.purpose ? (
          <ContentSection heading="Purpose">
            <Text className="text-foreground text-base leading-[1.85]">{card.purpose}</Text>
          </ContentSection>
        ) : null}

        {card.description ? (
          <ContentSection heading="Description">
            <Text tone="muted" className="text-base leading-[1.85]">
              {card.description}
            </Text>
          </ContentSection>
        ) : null}

        {card.orientation ? (
          <ContentSection heading="Orientation">
            <Text tone="muted" className="text-sm leading-[1.7]">
              {card.orientation}
            </Text>
          </ContentSection>
        ) : null}

        {card.practiceSteps.length > 0 || card.demonstrationSequence.length > 0 ? (
          <ContentSection heading="Practice">
            <div className="flex flex-col gap-(--space-lg)">
              <PracticeStepsList steps={card.practiceSteps} />
              <DemonstrationSequenceGallery frames={card.demonstrationSequence} />
            </div>
          </ContentSection>
        ) : null}

        {card.whatToNotice.length > 0 ? (
          <ContentSection heading="What to Notice">
            <WhatToNoticeList items={card.whatToNotice} />
          </ContentSection>
        ) : null}

        {card.supportingImages.length > 0 ? (
          <ContentSection heading="Supporting Images">
            <SupportingImagesGallery images={card.supportingImages} />
          </ContentSection>
        ) : null}

        {card.gentleNote ? (
          <ContentSection heading="Gentle Note">
            <Text className="text-foreground text-base leading-[1.85] italic">
              {card.gentleNote}
            </Text>
          </ContentSection>
        ) : null}

        {card.anchor ? (
          <ContentSection heading="Anchor">
            <Text className="text-foreground text-base leading-[1.85] font-medium">
              {card.anchor}
            </Text>
          </ContentSection>
        ) : null}
      </div>
    </div>
  );
}
