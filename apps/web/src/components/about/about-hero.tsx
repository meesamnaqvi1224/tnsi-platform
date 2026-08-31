import { Container, Eyebrow, Heading, Stack, Text } from '@tnsi/ui';
import { aboutContent } from '@/content/about';

const { purpose } = aboutContent;

export function AboutHero() {
  return (
    <section aria-labelledby="about-hero-heading" className="dark bg-background text-foreground">
      <Container size="xl" className="py-[var(--space-3xl)]">
        <Stack gap="md" className="max-w-3xl">
          <Eyebrow className="text-muted-foreground">{purpose.eyebrow}</Eyebrow>
          <Heading as="h1" id="about-hero-heading" size="2xl" className="text-4xl sm:text-5xl">
            {purpose.headline}
          </Heading>
          <Stack gap="sm">
            {purpose.paragraphs.map((paragraph) => (
              <Text key={paragraph} size="lg" tone="muted" className="max-w-prose">
                {paragraph}
              </Text>
            ))}
          </Stack>
        </Stack>
      </Container>
    </section>
  );
}
