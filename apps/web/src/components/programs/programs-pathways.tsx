import NextLink from 'next/link';
import { ArrowRight } from 'lucide-react';
import { buttonVariants, Container, Heading, Section, Stack, Text } from '@tnsi/ui';
import { programsOverviewContent } from '@/content/programs';

const { pathways, pathwayGroups } = programsOverviewContent;

export function ProgramsPathways() {
  return (
    <Section id="pathways" spacing="xl" className="border-border border-t" aria-label="Pathways">
      <Container size="xl">
        <Stack gap="4xl">
          {pathwayGroups.map((group) => {
            const groupPathways = pathways.filter((pathway) => pathway.category === group);
            if (groupPathways.length === 0) return null;

            return (
              <div key={group}>
                <Heading as="h2" size="lg" className="mb-(--space-2xl) text-2xl sm:text-3xl">
                  {group}
                </Heading>

                <div className="flex flex-col">
                  {groupPathways.map((pathway) => (
                    <article
                      key={pathway.id}
                      className="border-border grid grid-cols-1 gap-(--space-xl) border-t py-(--space-3xl) lg:grid-cols-[1fr_2fr] lg:gap-(--space-4xl)"
                    >
                      <div className="flex flex-col gap-(--space-sm)">
                        <h3 className="font-heading text-foreground text-2xl leading-[1.08] font-semibold tracking-tight sm:text-3xl">
                          {pathway.title}
                        </h3>
                        <Text tone="muted" className="text-base font-medium">
                          {pathway.tagline}
                        </Text>
                      </div>

                      <Stack gap="lg">
                        <Stack gap="md">
                          {/* Hub shows a teaser only (first approved paragraph); the full
                              paragraph set stays on the pathway's own dedicated page, so
                              clicking through adds real depth instead of repeating verbatim. */}
                          {pathway.paragraphs.slice(0, 1).map((paragraph) => (
                            <Text
                              key={paragraph}
                              tone="muted"
                              className="max-w-prose leading-relaxed"
                            >
                              {paragraph}
                            </Text>
                          ))}
                        </Stack>

                        <div>
                          <p className="text-muted-foreground mb-(--space-sm) font-mono text-xs tracking-[0.15em] uppercase">
                            Ideal for
                          </p>
                          <ul
                            className="flex flex-wrap gap-(--space-sm)"
                            aria-label={`Ideal for — ${pathway.title}`}
                          >
                            {pathway.idealFor.map((item) => (
                              <li
                                key={item}
                                className="border-border text-foreground rounded-full border px-(--space-md) py-(--space-xs) text-sm"
                              >
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <Stack gap="sm">
                          <div>
                            <NextLink
                              href={pathway.cta.href}
                              className={buttonVariants({ variant: 'primary', size: 'lg' })}
                            >
                              {pathway.cta.label}
                            </NextLink>
                          </div>

                          {'relatedCta' in pathway && pathway.relatedCta ? (
                            <NextLink
                              href={pathway.relatedCta.href}
                              className="interaction-text-link text-foreground group inline-flex items-center gap-(--space-sm) text-sm font-medium tracking-wide"
                            >
                              {pathway.relatedCta.label}
                              <ArrowRight aria-hidden className="interaction-arrow size-4" />
                            </NextLink>
                          ) : null}
                        </Stack>
                      </Stack>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </Stack>
      </Container>
    </Section>
  );
}
