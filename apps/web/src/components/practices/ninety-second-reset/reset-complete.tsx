import NextLink from 'next/link';
import { Check } from 'lucide-react';
import { buttonVariants, cn, Heading, Text } from '@tnsi/ui';
import { RESET_COPY, RESET_ROUTES, type ResetRoutes } from './content';
import { ResetArt } from './reset-art';
import { ResetBrand, ResetShell } from './reset-shell';

/**
 * Screen 3: a quiet close. No score, no rating, no celebration: a plain
 * statement that the practice happened, and two ways onward.
 */
export function ResetComplete({ routes = RESET_ROUTES }: { routes?: ResetRoutes }) {
  return (
    <ResetShell>
      <header>
        <ResetBrand />
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center py-8 text-center">
        <div className="w-[min(52vw,12rem)] sm:w-52">
          <ResetArt settled />
        </div>

        <p className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-(--rs-line) bg-(--rs-card) px-3.5 py-1.5 text-xs font-medium tracking-[0.18em] text-(--rs-ink-soft) uppercase">
          <Check aria-hidden className="size-3.5 text-(--rs-bronze)" />
          {RESET_COPY.complete.indicator}
          <span aria-hidden className="text-(--rs-line)">
            ·
          </span>
          {RESET_COPY.durationLabel}
        </p>

        <Heading
          as="h1"
          className="mt-6 text-4xl leading-[1.08] font-medium tracking-tight text-balance text-(--rs-ink) sm:text-5xl"
        >
          {RESET_COPY.complete.heading}
        </Heading>

        <Text className="mt-5 max-w-md text-base leading-relaxed text-(--rs-ink-soft) sm:text-lg">
          {RESET_COPY.complete.message}
        </Text>

        <div className="mt-8 flex w-full max-w-sm flex-col items-stretch gap-3">
          <NextLink
            href={routes.practices}
            className={cn(
              buttonVariants({ size: 'lg' }),
              'h-14 rounded-full bg-(--rs-ink) text-base text-(--rs-ground) hover:bg-(--rs-ink)/90',
            )}
          >
            {RESET_COPY.complete.finish}
          </NextLink>
          <NextLink
            href={routes.dashboard}
            className="inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm text-(--rs-ink-soft) underline-offset-4 hover:text-(--rs-ink) hover:underline focus-visible:ring-2 focus-visible:ring-(--rs-bronze) focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {RESET_COPY.complete.dashboard}
          </NextLink>
        </div>
      </main>
    </ResetShell>
  );
}
