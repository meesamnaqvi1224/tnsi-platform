import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { CalendlyEmbed } from '@/components/discovery-call/calendly-embed';
import { discoveryCallContent } from '@/content/discovery-call';

const { booking } = discoveryCallContent;

export function BookingSection() {
  return (
    <Section
      id={booking.id}
      spacing="xl"
      className="border-border border-t"
      aria-label={booking.heading}
    >
      <Container size="xl">
        <div className="grid grid-cols-1 items-start gap-(--space-3xl) lg:grid-cols-[1fr_1.1fr] lg:gap-(--space-5xl)">
          <Stack gap="2xl" className="lg:sticky lg:top-(--space-3xl)">
            <ChapterMarker index={booking.chapter} as="h2" title={booking.heading} />

            <Stack gap="lg">
              {booking.paragraphs.map((paragraph) => (
                <Text key={paragraph} tone="muted" className="text-base leading-[1.8]">
                  {paragraph}
                </Text>
              ))}
            </Stack>

            <ul className="text-muted-foreground flex flex-col gap-(--space-sm) text-sm">
              <li>Online booking</li>
              <li>Automatic time zone detection</li>
              <li>Confirmation email and calendar invitation</li>
              <li>Gentle reminder before your call</li>
            </ul>
          </Stack>

          <CalendlyEmbed />
        </div>
      </Container>
    </Section>
  );
}
