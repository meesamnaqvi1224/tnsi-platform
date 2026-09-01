import { Container, Eyebrow, Grid, Heading, Section, Stack, Text } from '@tnsi/ui';
import { aboutContent } from '@/content/about';

const { principles } = aboutContent;

export function ValuesSection() {
  return (
    <Section spacing="lg" aria-labelledby="values-heading">
      <Container size="xl">
        <Stack gap="sm" className="max-w-2xl">
          <Eyebrow>{principles.eyebrow}</Eyebrow>
          <Heading as="h2" id="values-heading" size="xl">
            {principles.headline}
          </Heading>
        </Stack>
        <Grid cols="4" gap="xl" className="mt-[var(--space-2xl)]">
          {principles.items.map((item) => (
            <Stack key={item.title} gap="sm">
              <Text weight="semibold">{item.title}</Text>
              <Text size="sm" tone="muted">
                {item.description}
              </Text>
            </Stack>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
