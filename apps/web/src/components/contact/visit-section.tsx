import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { ResponsiveImage } from '@/components/utility/responsive-image';
import { contactContent } from '@/content/contact';

const { visit } = contactContent;

export function VisitSection() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-label={visit.heading}>
      <Container size="xl">
        <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-2 lg:gap-(--space-5xl)">
          <Stack gap="2xl">
            <ChapterMarker index={visit.chapter} as="h2" title={visit.heading} />
            <Text tone="muted" className="max-w-prose text-base leading-relaxed">
              {visit.description}
            </Text>

            <dl className="flex flex-col gap-(--space-lg)">
              {visit.placeholders.map(({ label, value }) => (
                <div
                  key={label}
                  className="border-border flex flex-col gap-(--space-xs) border-t pt-(--space-lg)"
                >
                  <dt className="text-muted-foreground font-mono text-xs tracking-[0.15em] uppercase">
                    {label}
                  </dt>
                  <dd className="text-foreground text-sm leading-relaxed">{value}</dd>
                </div>
              ))}
            </dl>
          </Stack>

          <div className="border-border/70 relative min-h-[20rem] overflow-hidden border lg:min-h-full">
            <ResponsiveImage
              src="/images/contact/office.webp"
              alt="A calm interior looking through a large window onto woodland, with a low bench and a vase of foliage in warm daylight."
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
