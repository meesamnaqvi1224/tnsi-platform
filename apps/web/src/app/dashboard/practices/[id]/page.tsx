import { notFound } from 'next/navigation';
import NextLink from 'next/link';
import { Container, Divider, Eyebrow, Heading, Section, Stack, Text } from '@tnsi/ui';
import { PracticeCompleteButton } from '@/components/dashboard/practice-complete-button';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { requireAuthOrRedirect } from '@/lib/auth-api';
import {
  formatContentTypeLabel,
  formatPracticeDuration,
  getPublishedPracticeById,
  isPracticeCompleted,
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
  const user = await requireAuthOrRedirect();
  const { id } = await params;

  const idResult = practiceIdParam.safeParse({ id });
  if (!idResult.success) notFound();

  const practice = await getPublishedPracticeById(idResult.data.id);
  if (!practice) notFound();

  const completed = await isPracticeCompleted(user.id, practice.id);
  const duration = formatPracticeDuration(practice.durationSeconds);
  const driveEmbedUrl = practice.mediaUrl ? toGoogleDriveEmbedUrl(practice.mediaUrl) : null;

  const metaParts = [formatContentTypeLabel(practice.contentType)];
  if (duration) metaParts.push(duration);
  if (practice.category) metaParts.push(practice.category);

  return (
    <>
      <SiteHeader />
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
                  <Heading as="h1" size="xl">
                    {practice.title}
                  </Heading>
                  {practice.description ? (
                    <Text tone="muted" className="text-base leading-[1.85] lg:text-lg">
                      {practice.description}
                    </Text>
                  ) : null}
                </header>

                {driveEmbedUrl ? (
                  <iframe
                    src={driveEmbedUrl}
                    className="aspect-video w-full rounded-sm"
                    allow="autoplay"
                    title={practice.title}
                  />
                ) : practice.mediaUrl && AUDIO_CONTENT_TYPES.has(practice.contentType) ? (
                  <audio controls src={practice.mediaUrl} className="w-full">
                    Your browser does not support the audio element.
                  </audio>
                ) : practice.mediaUrl && VIDEO_CONTENT_TYPES.has(practice.contentType) ? (
                  <video
                    controls
                    src={practice.mediaUrl}
                    poster={practice.thumbnailUrl ?? undefined}
                    className="w-full rounded-sm"
                  >
                    Your browser does not support the video element.
                  </video>
                ) : null}

                <Divider />

                <Stack gap="lg">
                  <Eyebrow>Practice</Eyebrow>
                  <PracticeCompleteButton practiceId={practice.id} initialCompleted={completed} />
                </Stack>
              </Stack>
            </div>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
