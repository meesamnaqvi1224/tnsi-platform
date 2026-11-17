import { notFound } from 'next/navigation';
import { Alert, Container, Section } from '@tnsi/ui';
import { REFLECTION_EDITOR, REFLECTION_STATES } from '@tnsi/core';
import { ConsentNotice } from '@/components/dashboard/reflections/consent-notice';
import { ReflectionEditor } from '@/components/dashboard/reflections/reflection-editor';
import { getJournalConsent } from '@/lib/journal-consent';
import { getJournalEntry } from '@/lib/journal';
import { getJournalPageAccess } from '@/lib/journal-page-access';
import { createPageMetadata } from '@/lib/seo';
import { journalEntryIdParam } from '@/lib/validation';

// A generic title: the entry's own title is private and never goes in page metadata.
export const metadata = createPageMetadata({
  title: REFLECTION_EDITOR.pageTitle,
  description: 'Your private reflection.',
  path: '/dashboard/reflections',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * One reflection, owner only. Another member's entry is indistinguishable from one that does not exist
 * (404). Only the id is in the address; the writing is never part of the URL.
 */
export default async function ReflectionPage({ params }: PageProps) {
  const id = journalEntryIdParam.safeParse(await params);
  if (!id.success) notFound();

  const access = await getJournalPageAccess();
  if (access.state !== 'ok') {
    return (
      <Section spacing="lg">
        <Container size="lg">
          <Alert variant="destructive">
            {access.state === 'locked'
              ? REFLECTION_STATES.lockedForDeletion
              : REFLECTION_STATES.loadFailed}
          </Alert>
        </Container>
      </Section>
    );
  }

  const entry = await getJournalEntry(access.userId, id.data.id);
  if (!entry) notFound();

  // Reading and deleting never need the acknowledgement, so the entry is always shown; changing it does,
  // so when it is missing, withdrawn or out of date the notice appears above it.
  const consent = await getJournalConsent(access.userId);

  return (
    <Section spacing="lg">
      <Container size="lg">
        {consent.status !== 'granted' ? (
          <div className="mb-8">
            <ConsentNotice version={consent.version} />
          </div>
        ) : null}
        <ReflectionEditor
          initialEntry={{
            id: entry.id,
            title: entry.title,
            content: entry.content,
            status: entry.status,
            createdAt: entry.createdAt.toISOString(),
          }}
        />
      </Container>
    </Section>
  );
}
