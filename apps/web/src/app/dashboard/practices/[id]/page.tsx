import { notFound } from 'next/navigation';
import NextLink from 'next/link';
import { Badge, Container, Eyebrow, Heading, Section, Stack, Text } from '@tnsi/ui';
import { PracticeExperience } from '@/components/dashboard/practice-experience';
import { SaveToggleButton } from '@/components/dashboard/save-toggle-button';
import { requireMemberAccessOrRedirect } from '@/lib/auth-api';
import {
  formatContentTypeLabel,
  formatPracticeDuration,
  getPracticeCompletion,
  getPracticeReflection,
  getPublishedPracticeById,
  isPracticeSaved,
  toGoogleDriveEmbedUrl,
} from '@/lib/practices';
import { createPageMetadata } from '@/lib/seo';
import { practiceIdParam } from '@/lib/validation';

interface PracticeDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PracticeDetailPageProps) {
  const { id } = await params;
  const idResult = practiceIdParam.safeParse({ id });
  const practice = idResult.success ? await getPublishedPracticeById(idResult.data.id) : null;

  return createPageMetadata({
    title: practice?.title ?? 'Practice',
    description: practice?.description ?? 'The Nervous System Institute practice library.',
    path: `/dashboard/practices/${id}`,
    noIndex: true,
  });
}

/**
 * Media type is decided from `contentType`, not guessed from the URL:
 * audio/meditation/breathwork are audio-guided, video/movement are
 * visually demonstrated, journal has no media player. Only renders a
 * player when `mediaUrl` is actually set — never invents one.
 */
const AUDIO_CONTENT_TYPES = new Set(['audio', 'meditation', 'breathwork']);
const VIDEO_CONTENT_TYPES = new Set(['video', 'movement']);

export default async function PracticeDetailPage({ params }: PracticeDetailPageProps) {
  const user = await requireMemberAccessOrRedirect();
  const { id } = await params;

  const idResult = practiceIdParam.safeParse({ id });
  if (!idResult.success) notFound();

  const practice = await getPublishedPracticeById(idResult.data.id);
  if (!practice) notFound();

  const completion = await getPracticeCompletion(user.id, practice.id);
  const reflection = completion ? await getPracticeReflection(user.id, completion.id) : null;
  const saved = await isPracticeSaved(user.id, practice.id);
  const completed = completion?.completed ?? false;
  const duration = formatPracticeDuration(practice.durationSeconds);
  const driveEmbedUrl = practice.mediaUrl ? toGoogleDriveEmbedUrl(practice.mediaUrl) : null;
  const mediaKind: 'audio' | 'video' | null = AUDIO_CONTENT_TYPES.has(practice.contentType)
    ? 'audio'
    : VIDEO_CONTENT_TYPES.has(practice.contentType)
      ? 'video'
      : null;
  const hasPlayableMedia = !!driveEmbedUrl || !!(practice.mediaUrl && mediaKind);

  const metaParts = [formatContentTypeLabel(practice.contentType)];
  if (duration) metaParts.push(duration);
  if (practice.category) metaParts.push(practice.category);
  metaParts.push(`Level ${practice.difficulty}`);

  return (
    <>
      <main id="main-content">
        <Section spacing="xl">
          <Container size="xl">
            <div className="mx-auto max-w-3xl">
              <Stack gap="2xl">
                <NextLink
                  href="/dashboard/practices"
                  className="interaction-text-link-underline w-fit"
                >
                  ← Practice Library
                </NextLink>

                <header className="border-border flex flex-col gap-(--space-md) border-b pb-(--space-2xl)">
                  <Eyebrow>{metaParts.join(' · ')}</Eyebrow>
                  <Stack direction="row" gap="md" className="items-start justify-between">
                    <Heading as="h1" size="xl">
                      {practice.title}
                    </Heading>
                    <SaveToggleButton practiceId={practice.id} initialSaved={saved} />
                  </Stack>
                  {practice.description ? (
                    <Text tone="muted" className="text-base leading-[1.85] lg:text-lg">
                      {practice.description}
                    </Text>
                  ) : null}
                  {practice.tags.length > 0 ? (
                    <Stack direction="row" gap="2xs" wrap="wrap">
                      {practice.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </Stack>
                  ) : null}
                </header>

                {!hasPlayableMedia && practice.contentType !== 'journal' ? (
                  // `journal` genuinely has no media by design; every other
                  // content type is meant to carry a recording - if one
                  // doesn't have `mediaUrl` set yet, that's a real content
                  // gap worth an honest notice rather than a silent empty
                  // space where a player would otherwise sit. Still shown
                  // above PracticeExperience, which still offers "Mark as
                  // Complete" either way.
                  <div className="border-border/80 bg-background rounded-sm border p-(--space-lg)">
                    <Text tone="muted">
                      This practice isn&apos;t available yet. Check back soon.
                    </Text>
                  </div>
                ) : null}

                <PracticeExperience
                  practiceId={practice.id}
                  driveEmbedUrl={driveEmbedUrl}
                  driveEmbedTitle={practice.title}
                  mediaUrl={practice.mediaUrl}
                  mediaKind={mediaKind}
                  thumbnailUrl={practice.thumbnailUrl}
                  initialPlayCount={completion?.playCount ?? 0}
                  initialPositionSeconds={completion?.positionSeconds ?? 0}
                  initialCompleted={completed}
                  initialCompletionId={completion?.id ?? null}
                  initialProgressPct={completion?.progressPct ?? 0}
                  initialReflection={reflection}
                />
              </Stack>
            </div>
          </Container>
        </Section>
      </main>
    </>
  );
}
