import { Container, Eyebrow, Heading, Section, Stack, Text } from '@tnsi/ui';
import { EditorialImage } from '@/components/utility/editorial-image';
import { aboutImages } from '@/content/images';
import { aboutContent } from '@/content/about';

const { institute } = aboutContent;

export function MissionSection() {
  return (
    <Section spacing="xl" aria-labelledby="mission-heading">
      <Container size="xl">
        <div className="grid grid-cols-1 items-center gap-[var(--space-2xl)] lg:grid-cols-2 lg:gap-[var(--space-3xl)]">
          <Stack gap="md">
            <Eyebrow>{institute.eyebrow}</Eyebrow>
            <Heading as="h2" id="mission-heading" size="xl">
              {institute.headline}
            </Heading>
            {institute.paragraphs.map((paragraph) => (
              <Text key={paragraph} tone="muted" className="max-w-prose">
                {paragraph}
              </Text>
            ))}
          </Stack>

          <EditorialImage
            src={aboutImages.missionEditorial}
            alt="A warm consultation room with two soft armchairs facing each other, lit by natural light from tall garden windows."
            aspect="landscape"
            className="rounded-lg"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </Container>
    </Section>
  );
}
