import { Container, Section, Stack, Text } from '@tnsi/ui';

export interface LegalSection {
  id: string;
  heading: string;
  paragraphs: readonly string[];
}

interface LegalDocumentProps {
  title: string;
  lastUpdated: string;
  introduction?: string;
  sections: readonly LegalSection[];
}

export function LegalDocument({ title, lastUpdated, introduction, sections }: LegalDocumentProps) {
  return (
    <Section spacing="xl" aria-labelledby="legal-document-heading">
      <Container size="xl">
        <article className="mx-auto max-w-3xl">
          <Stack gap="2xl">
            <header className="border-border flex flex-col gap-(--space-md) border-b pb-(--space-2xl)">
              <h1
                id="legal-document-heading"
                className="font-heading text-foreground text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl"
              >
                {title}
              </h1>
              <Text tone="muted" className="font-mono text-xs tracking-[0.15em] uppercase">
                Last updated {lastUpdated}
              </Text>
              {introduction ? (
                <Text tone="muted" className="text-base leading-[1.85] lg:text-lg">
                  {introduction}
                </Text>
              ) : null}
            </header>

            <div className="flex flex-col gap-(--space-3xl)">
              {sections.map((section) => (
                <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`}>
                  <Stack gap="lg">
                    <h2
                      id={`${section.id}-heading`}
                      className="font-heading text-foreground text-2xl font-semibold tracking-tight"
                    >
                      {section.heading}
                    </h2>
                    {section.paragraphs.map((paragraph) => (
                      <Text key={paragraph} tone="muted" className="text-base leading-[1.85]">
                        {paragraph}
                      </Text>
                    ))}
                  </Stack>
                </section>
              ))}
            </div>
          </Stack>
        </article>
      </Container>
    </Section>
  );
}
