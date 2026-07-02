import { CalendarDays } from 'lucide-react';
import { Stack, Text } from '@tnsi/ui';

export function CalendlyPlaceholder() {
  return (
    <div
      aria-label="Booking calendar placeholder"
      className="border-border/60 bg-background/80 flex min-h-[28rem] flex-col items-center justify-center gap-(--space-xl) rounded-lg border p-(--space-3xl) lg:min-h-[32rem]"
    >
      <div className="border-border/50 bg-secondary/40 flex size-16 items-center justify-center rounded-full border">
        <CalendarDays aria-hidden className="text-muted-foreground size-7" strokeWidth={1.25} />
      </div>

      <Stack gap="sm" className="max-w-xs text-center">
        <p className="font-heading text-foreground text-lg font-medium tracking-tight">
          Scheduling opens here
        </p>
        <Text tone="muted" className="text-sm leading-relaxed">
          Calendly booking will be embedded in this space. Select a time, confirm your details, and
          receive your invitation — all without leaving this page.
        </Text>
      </Stack>

      <div className="border-border/40 flex w-full max-w-sm flex-col gap-(--space-sm) rounded-lg border p-(--space-lg)">
        {['Select a date', 'Choose a time', 'Confirm your details'].map((step, index) => (
          <div
            key={step}
            className="bg-secondary/30 flex items-center gap-(--space-md) rounded-lg px-(--space-md) py-(--space-sm)"
          >
            <span className="text-muted-foreground font-mono text-xs">{index + 1}</span>
            <span className="text-muted-foreground text-sm">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
