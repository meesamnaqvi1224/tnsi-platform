import NextLink from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  Container,
  EmptyState,
  Eyebrow,
  Grid,
  Heading,
  Section,
  Stack,
  Text,
} from '@tnsi/ui';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { requireAuthOrRedirect } from '@/lib/auth-api';
import {
  formatContentTypeLabel,
  formatPracticeDuration,
  getPublishedPractices,
  isPracticeCompleted,
} from '@/lib/practices';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Practice Library',
  description: 'The Nervous System Institute practice library.',
  path: '/dashboard/practices',
  noIndex: true,
});

function practiceMeta(practice: {
  contentType: string;
  durationSeconds: number | null;
  category: string | null;
  difficulty: number;
}): string {
  const parts = [formatContentTypeLabel(practice.contentType)];
  const duration = formatPracticeDuration(practice.durationSeconds);
  if (duration) parts.push(duration);
  if (practice.category) parts.push(practice.category);
  return parts.join(' · ');
}

export default async function PracticeLibraryPage() {
  const user = await requireAuthOrRedirect();
  const practiceList = await getPublishedPractices();

  // Reuses the existing per-practice `isPracticeCompleted` lookup (same
  // query the practice detail page already runs) rather than introducing a
  // new batched query — run in parallel so N practices cost one round of
  // concurrent indexed lookups, not N sequential ones.
  const completions = await Promise.all(
    practiceList.map((practice) => isPracticeCompleted(user.id, practice.id)),
  );

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <Section spacing="xl">
          <Container size="xl">
            <div className="mx-auto max-w-5xl">
              <Stack gap="2xl">
                <header className="border-border flex flex-col gap-(--space-md) border-b pb-(--space-2xl)">
                  <Eyebrow>Practice Library</Eyebrow>
                  <Heading as="h1" size="xl">
                    Practice Library
                  </Heading>
                  <Text tone="muted" className="text-base leading-[1.85] lg:text-lg">
                    A curated collection of practices from The Nervous System Institute.
                  </Text>
                </header>

                {practiceList.length === 0 ? (
                  <EmptyState
                    title="Practices are being prepared."
                    description="The practice library will appear here as content becomes available."
                  />
                ) : (
                  <Grid cols="2" gap="lg">
                    {practiceList.map((practice, index) => (
                      <NextLink
                        key={practice.id}
                        href={`/dashboard/practices/${practice.id}`}
                        className="interaction-focus interaction-colors rounded-lg"
                      >
                        <Card className="hover:border-foreground/40 duration-base ease-standard h-full transition-colors">
                          <CardHeader>
                            <Stack
                              direction="row"
                              gap="sm"
                              className="items-center justify-between"
                            >
                              <Text tone="muted" size="xs" className="tracking-[0.1em] uppercase">
                                {practiceMeta(practice)}
                              </Text>
                              {completions[index] ? (
                                <Text role="status" tone="muted" size="xs" className="shrink-0">
                                  Completed
                                </Text>
                              ) : null}
                            </Stack>
                            <Heading
                              as="h2"
                              size="xs"
                              className="font-heading text-foreground text-lg font-semibold"
                            >
                              {practice.title}
                            </Heading>
                          </CardHeader>
                          {practice.description ? (
                            <CardContent>
                              <Text tone="muted" className="text-sm leading-[1.7]">
                                {practice.description}
                              </Text>
                            </CardContent>
                          ) : null}
                        </Card>
                      </NextLink>
                    ))}
                  </Grid>
                )}
              </Stack>
            </div>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
