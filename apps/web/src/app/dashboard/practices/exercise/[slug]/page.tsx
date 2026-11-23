import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { isExerciseSlug } from '@tnsi/core';
import { ExerciseExperience } from '@/components/practices/guided-exercise/exercise-experience';
import { ResetBrand, ResetShell } from '@/components/practices/ninety-second-reset/reset-shell';
import { LockedPracticeNotice } from '@/components/dashboard/locked-practice-notice';
import { getGuidedExercise } from '@/content/cms/loaders';
import { requireMemberAccessOrRedirect } from '@/lib/auth-api';
import { contentAccessFor } from '@/lib/membership';
import { getPublishedExercisePractice } from '@/lib/practices';
import { createPageMetadata } from '@/lib/seo';

interface ExercisePageProps {
  params: Promise<{ slug: string }>;
}

export const metadata = createPageMetadata({
  title: 'Guided exercise',
  description: 'A short guided exercise.',
  path: '/dashboard/practices',
  noIndex: true,
});

/**
 * A guided exercise, drawn by the reusable exercise screen from its CMS content. It exists only
 * while a published practice carries it (a draft practice is a 404), and only a member who can open
 * that practice sees the content: a locked member gets the usual membership notice and nothing else.
 */
export default async function GuidedExercisePage({ params }: ExercisePageProps) {
  const user = await requireMemberAccessOrRedirect();
  const { slug } = await params;
  if (!isExerciseSlug(slug)) notFound();

  const practice = await getPublishedExercisePractice(slug);
  if (!practice) notFound();

  if (!contentAccessFor(user.entitlements).canOpen(practice)) {
    return (
      <ResetShell>
        <header>
          <ResetBrand />
        </header>
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 py-8">
          <LockedPracticeNotice />
          <NextLink href="/dashboard/practices" className="underline underline-offset-4">
            Back to Practices
          </NextLink>
        </main>
      </ResetShell>
    );
  }

  const exercise = await getGuidedExercise(slug);
  if (!exercise) notFound();

  return <ExerciseExperience exercise={exercise} />;
}
