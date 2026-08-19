import NextLink from 'next/link';
import { Container, Divider, EmptyState, Eyebrow, Heading, Section, Stack, Text } from '@tnsi/ui';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { requireAuth } from '@/lib/auth-api';
import {
  formatContentTypeLabel,
  formatPracticeDuration,
  getPublishedPractices,
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
  await requireAuth();
  const practiceList = await getPublishedPractices();

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <Section spacing="xl">
          <Container size="xl">
            <div className="mx-auto max-w-3xl">
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
                  <ul className="flex flex-col">
                    {practiceList.map((practice, index) => (
                      <li key={practice.id}>
                        {index > 0 ? <Divider className="my-(--space-xl)" /> : null}
                        <Stack gap="3xs">
                          <NextLink
                            href={`/dashboard/practices/${practice.id}`}
                            className="interaction-colors interaction-focus font-heading text-foreground hover:text-muted-foreground w-fit text-lg font-semibold"
                          >
                            {practice.title}
                          </NextLink>
                          <Text tone="muted" size="sm">
                            {practiceMeta(practice)}
                          </Text>
                          {practice.description ? (
                            <Text tone="muted" className="mt-(--space-2xs) text-base leading-[1.7]">
                              {practice.description}
                            </Text>
                          ) : null}
                        </Stack>
                      </li>
                    ))}
                  </ul>
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
