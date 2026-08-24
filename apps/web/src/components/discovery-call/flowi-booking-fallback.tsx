import { CalendarDays } from 'lucide-react';
import { buttonVariants, cn, Stack, Text } from '@tnsi/ui';

/**
 * Shown when the embedded Flowi booking widget fails to load (network
 * error, blocked request) — not a "coming soon" placeholder. Gives the
 * visitor a real way to continue: the same email address already used
 * sitewide for general enquiries (content/contact.ts).
 */
export function FlowiBookingFallback() {
  return (
    <div
      aria-label="Booking tool unavailable"
      className="border-border/60 bg-background/80 flex min-h-[28rem] w-full min-w-0 flex-col items-center justify-center gap-(--space-xl) rounded-lg border p-(--space-xl) sm:p-(--space-3xl) lg:min-h-[32rem]"
    >
      <div className="border-border/50 bg-secondary/40 flex size-16 items-center justify-center rounded-full border">
        <CalendarDays aria-hidden className="text-muted-foreground size-7" strokeWidth={1.25} />
      </div>

      <Stack gap="sm" className="max-w-xs text-center">
        <p className="font-heading text-foreground text-lg font-medium tracking-tight">
          We couldn&rsquo;t load the booking tool
        </p>
        <Text tone="muted" className="text-sm leading-relaxed">
          Please try refreshing the page. If the problem continues, email us directly and
          we&rsquo;ll arrange a time that works for you.
        </Text>
      </Stack>

      <a
        href="mailto:hello@tnsi.org"
        className={cn(buttonVariants({ variant: 'primary', size: 'md' }))}
      >
        Email Us
      </a>
    </div>
  );
}
