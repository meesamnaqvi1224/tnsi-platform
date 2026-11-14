import { Alert, Container, Section } from '@tnsi/ui';
import { REFLECTION_EDITOR, REFLECTION_STATES } from '@tnsi/core';
import { ReflectionEditor } from '@/components/dashboard/reflections/reflection-editor';
import { getJournalPageAccess } from '@/lib/journal-page-access';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: REFLECTION_EDITOR.pageTitle,
  description: 'Write a private reflection.',
  path: '/dashboard/reflections/new',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

/** A new, empty reflection. Nothing is created until the member saves. */
export default async function NewReflectionPage() {
  const access = await getJournalPageAccess();
  return (
    <Section spacing="lg">
      <Container size="lg">
        {access.state === 'ok' ? (
          <ReflectionEditor initialEntry={null} />
        ) : (
          <Alert variant="destructive">
            {access.state === 'locked'
              ? REFLECTION_STATES.lockedForDeletion
              : REFLECTION_STATES.loadFailed}
          </Alert>
        )}
      </Container>
    </Section>
  );
}
