import NextLink from 'next/link';
import { Clock } from 'lucide-react';
import { buttonVariants, cn, Heading, Text } from '@tnsi/ui';
import { ResetBrand, ResetShell } from '../ninety-second-reset/reset-shell';
import { ChairArt } from './chair-art';
import { CHAIR_COPY, CHAIR_ROUTES } from './content';
import type { ResetRoutes } from '../ninety-second-reset/content';

/** Screen 1: a spacious introduction. One decision on it: begin. */
export function ChairIntro({ routes = CHAIR_ROUTES }: { routes?: ResetRoutes }) {
  return (
    <ResetShell>
      <header className="flex items-start justify-between gap-4">
        <ResetBrand />
        <NextLink
          href={routes.practices}
          className="-mt-2 -mr-3 inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm whitespace-nowrap text-(--rs-ink-soft) underline-offset-4 hover:text-(--rs-ink) hover:underline focus-visible:ring-2 focus-visible:ring-(--rs-bronze) focus-visible:outline-none"
        >
          {CHAIR_COPY.backToPractices}
        </NextLink>
      </header>

      <main className="grid flex-1 items-center gap-7 py-4 sm:gap-8 sm:py-8 lg:grid-cols-2 lg:gap-16 lg:py-12">
        <div className="order-1 mx-auto w-[min(56vw,14.5rem)] sm:w-[21rem] lg:order-2 lg:w-full lg:max-w-[31rem] lg:justify-self-center">
          <ChairArt />
        </div>

        <div className="order-2 mx-auto flex max-w-xl flex-col items-center text-center lg:order-1 lg:mx-0 lg:items-start lg:text-left">
          <p className="inline-flex items-center gap-2.5 rounded-full border border-(--rs-line) bg-(--rs-card) px-3.5 py-1.5 text-xs font-medium tracking-[0.18em] text-(--rs-ink-soft) uppercase">
            <span aria-hidden className="size-1.5 rounded-full bg-(--rs-bronze)" />
            {CHAIR_COPY.condition}
            <span aria-hidden className="text-(--rs-line)">
              ·
            </span>
            {CHAIR_COPY.format}
          </p>

          <Heading
            as="h1"
            className="mt-4 text-5xl leading-[1.02] font-medium tracking-tight text-balance text-(--rs-ink) sm:text-6xl lg:text-7xl"
          >
            {CHAIR_COPY.title}
          </Heading>

          <Text className="font-heading mt-3 text-xl text-(--rs-bronze) italic sm:text-2xl">
            {CHAIR_COPY.subtitle}
          </Text>

          <Text className="mt-4 max-w-md text-base leading-relaxed text-(--rs-ink-soft) sm:mt-5 sm:text-lg">
            {CHAIR_COPY.purpose}
          </Text>

          <p className="mt-5 inline-flex items-center gap-2 text-sm text-(--rs-ink-soft) sm:mt-6">
            <Clock aria-hidden className="size-4 text-(--rs-bronze)" />
            {CHAIR_COPY.durationLabel}
          </p>

          <NextLink
            href={routes.session}
            className={cn(
              buttonVariants({ size: 'lg' }),
              'mt-6 h-14 w-full max-w-sm rounded-full bg-(--rs-ink) px-10 text-base text-(--rs-ground) hover:bg-(--rs-ink)/90 sm:mt-7 sm:w-auto sm:min-w-64',
            )}
          >
            {CHAIR_COPY.begin}
          </NextLink>
        </div>
      </main>
    </ResetShell>
  );
}
