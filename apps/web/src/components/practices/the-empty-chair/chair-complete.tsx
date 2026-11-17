import NextLink from 'next/link';
import { Check } from 'lucide-react';
import { buttonVariants, cn, Heading, Text } from '@tnsi/ui';
import { ResetBrand, ResetShell } from '../ninety-second-reset/reset-shell';
import { ChairArt } from './chair-art';
import { CHAIR_COPY, CHAIR_ROUTES } from './content';
import type { ResetRoutes } from '../ninety-second-reset/content';

/**
 * Screen 3: a quiet close. No score, no rating, no celebration. The reflection prompt
 * is only a sentence to hold: there is no field, nothing is submitted and nothing is saved.
 */
export function ChairComplete({ routes = CHAIR_ROUTES }: { routes?: ResetRoutes }) {
  return (
    <ResetShell>
      <header>
        <ResetBrand />
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center py-8 text-center">
        <div className="w-[min(52vw,12rem)] sm:w-52">
          <ChairArt settled />
        </div>

        <p className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-(--rs-line) bg-(--rs-card) px-3.5 py-1.5 text-xs font-medium tracking-[0.18em] text-(--rs-ink-soft) uppercase">
          <Check aria-hidden className="size-3.5 text-(--rs-bronze)" />
          {CHAIR_COPY.complete.indicator}
          <span aria-hidden className="text-(--rs-line)">
            ·
          </span>
          {CHAIR_COPY.durationLabel}
        </p>

        <Heading
          as="h1"
          className="mt-6 text-4xl leading-[1.08] font-medium tracking-tight text-balance text-(--rs-ink) sm:text-5xl"
        >
          {CHAIR_COPY.complete.heading}
        </Heading>

        <Text className="mt-5 max-w-md text-base leading-relaxed text-(--rs-ink-soft) sm:text-lg">
          {CHAIR_COPY.complete.message}
        </Text>

        <figure className="mt-7 max-w-md border-t border-(--rs-line) pt-6">
          <figcaption className="text-xs font-medium tracking-[0.18em] text-(--rs-bronze-text) uppercase">
            {CHAIR_COPY.complete.promptLabel}
          </figcaption>
          <blockquote className="font-heading mt-2 text-xl leading-snug text-balance text-(--rs-ink) italic sm:text-2xl">
            {CHAIR_COPY.complete.prompt}
          </blockquote>
        </figure>

        <div className="mt-8 flex w-full max-w-sm flex-col items-stretch gap-3">
          <NextLink
            href={routes.practices}
            className={cn(
              buttonVariants({ size: 'lg' }),
              'h-14 rounded-full bg-(--rs-ink) text-base text-(--rs-ground) hover:bg-(--rs-ink)/90',
            )}
          >
            {CHAIR_COPY.complete.finish}
          </NextLink>
        </div>
      </main>
    </ResetShell>
  );
}
