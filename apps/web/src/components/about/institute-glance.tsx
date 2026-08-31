import { Container, Eyebrow, Grid, Heading, Section, Stack, Text } from '@tnsi/ui';
import { aboutContent } from '@/content/about';

const { glance } = aboutContent;

export function InstituteGlance() {
  return (
    <Section spacing="xl" className="border-border border-t" aria-labelledby="glance-heading">
      <Container size="xl">
        <Stack gap="sm" className="max-w-2xl">
          <Eyebrow>{glance.eyebrow}</Eyebrow>
          <Heading as="h2" id="glance-heading" size="xl">
            {glance.headline}
          </Heading>
        </Stack>

        <Grid cols="3" gap="xl" className="mt-[var(--space-2xl)]">
          {glance.items.map((item) => (
            <Stack key={item.title} gap="sm" className="border-border border-t pt-(--space-lg)">
              <Text weight="semibold" className="font-heading text-lg">
                {item.title}
              </Text>
              <Text size="sm" tone="muted" className="leading-relaxed">
                {item.description}
              </Text>
            </Stack>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
