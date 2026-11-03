import { ChairSession } from '@/components/practices/the-empty-chair/chair-session';
import { CHAIR_COPY } from '@/components/practices/the-empty-chair/content';
import { requireMemberAccessOrRedirect } from '@/lib/auth-api';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: CHAIR_COPY.title,
  description: `A guided reflection, ${CHAIR_COPY.durationLabel}.`,
  path: '/dashboard/practices/the-empty-chair/session',
  noIndex: true,
});

/** Screen 2 of The Empty Chair: the guided practice. */
export default async function TheEmptyChairSessionPage() {
  await requireMemberAccessOrRedirect();
  return <ChairSession />;
}
