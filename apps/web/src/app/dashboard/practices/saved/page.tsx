import NextLink from 'next/link';
import {
  Badge,
  buttonVariants,
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
import { SaveToggleButton } from '@/components/dashboard/save-toggle-button';
import { requireMemberAccessOrRedirect } from '@/lib/auth-api';
import { formatContentTypeLabel, formatPracticeDuration, getSavedPractices } from '@/lib/practices';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Saved Practices',
  description: "Practices you've chosen to keep close.",
  path: '/dashboard/practices/saved',
  noIndex: true,
});

/** Meta line below the title, mirroring the Practice Library card's own — no status badge here (saved practices aren't filtered by completion). */
function savedPracticeMeta(practice: {
  durationSeconds: number | null;
  category: string | null;
}): string {
  const parts: string[] = [];
  const duration = formatPracticeDuration(practice.durationSeconds);
  if (duration) parts.push(duration);
  if (practice.category) parts.push(practice.category);
  return parts.join(' · ');
}

export default async function SavedPracticesPage() {
  const user = await requireMemberAccessOrRedirect();
  const practices = await getSavedPractices(user.id);

  return (
    <main id="main-content">
      <Section spacing="xl">
        <Container size="xl">
          <div className="mx-auto max-w-5xl">
            <Stack gap="2xl">
              <NextLink
                href="/dashboard/practices"
                className="interaction-text-link-underline w-fit"
              >
                ← Practice Library
              </NextLink>

              <header className="border-border flex flex-col gap-(--space-md) border-b pb-(--space-2xl)">
                <Eyebrow>Saved Practices</Eyebrow>
                <Heading as="h1" size="xl">
                  Saved Practices
                </Heading>
                <Text tone="muted" className="text-base leading-[1.85] lg:text-lg">
                  Practices you&rsquo;ve chosen to keep close.
                </Text>
              </header>

              {practices.length === 0 ? (
                <EmptyState
                  title="No saved practices yet"
                  description="Save practices you want to come back to later."
                  action={
                    <NextLink
                      href="/dashboard/practices"
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Explore Practices
                    </NextLink>
                  }
                />
              ) : (
                <Grid cols="2" gap="lg">
                  {practices.map((practice) => (
                    <Card
                      key={practice.id}
                      className="hover:border-foreground/40 duration-base ease-standard h-full transition-colors"
                    >
                      <CardHeader>
                        <Stack direction="row" gap="sm" className="items-center justify-between">
                          <Badge variant="outline">
                            {formatContentTypeLabel(practice.contentType)}
                          </Badge>
                          <SaveToggleButton practiceId={practice.id} initialSaved />
                        </Stack>
                        <NextLink
                          href={`/dashboard/practices/${practice.id}`}
                          className="interaction-focus interaction-colors mt-(--space-xs) block w-fit rounded-sm"
                        >
                          <Heading
                            as="h2"
                            size="xs"
                            className="font-heading text-foreground text-lg font-semibold"
                          >
                            {practice.title}
                          </Heading>
                        </NextLink>
                        <Text tone="muted" size="xs" className="tracking-[0.02em]">
                          {savedPracticeMeta(practice)}
                        </Text>
                      </CardHeader>
                      {practice.description ? (
                        <CardContent>
                          <Text tone="muted" className="text-sm leading-[1.7]">
                            {practice.description}
                          </Text>
                        </CardContent>
                      ) : null}
                    </Card>
                  ))}
                </Grid>
              )}
            </Stack>
          </div>
        </Container>
      </Section>
    </main>
  );
}
