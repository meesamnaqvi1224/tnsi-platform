import { ResponsiveImage } from '@/components/utility/responsive-image';
import { ChapterMarker, Container, Section, Stack, Text } from '@tnsi/ui';
import { facultyContent } from '@/content/faculty';

const { founder } = facultyContent;

export function FacultyProfile() {
  return (
    <Section
      id={founder.id}
      spacing="xl"
      className="border-border border-t"
      aria-label={`${founder.name} — Founder`}
    >
      <Container size="xl">
        <ChapterMarker
          index={founder.chapter}
          as="h2"
          title="Founder"
          className="mb-(--space-3xl)"
        />

        <div className="grid grid-cols-1 items-start gap-(--space-3xl) lg:grid-cols-[2fr_3fr] lg:gap-(--space-5xl)">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden lg:mx-0 lg:max-w-none">
            <ResponsiveImage
              src={founder.imageSrc}
              alt={founder.imageAlt}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
            <p className="text-muted-foreground absolute inset-x-0 bottom-6 text-center text-xs tracking-[0.12em] uppercase">
              Portrait placeholder
            </p>
          </div>

          <Stack gap="2xl">
            <Stack gap="md">
              <h3 className="font-heading text-foreground text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                {founder.name}
              </h3>
              <ul className="border-border flex flex-col gap-(--space-xs) border-t pt-(--space-lg)">
                {founder.roles.map((role) => (
                  <li key={role} className="text-muted-foreground text-sm tracking-wide uppercase">
                    {role}
                  </li>
                ))}
              </ul>
            </Stack>

            <Stack gap="lg">
              {founder.biography.map((paragraph) => (
                <Text key={paragraph} tone="muted" className="text-base leading-relaxed">
                  {paragraph}
                </Text>
              ))}
            </Stack>

            <blockquote className="border-border border-l-2 pl-(--space-xl)">
              <Text className="text-foreground text-lg leading-relaxed font-medium italic">
                {founder.closingQuote}
              </Text>
            </blockquote>
          </Stack>
        </div>
      </Container>
    </Section>
  );
}
