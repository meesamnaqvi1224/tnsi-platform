import { ChairIntro } from '@/components/practices/the-empty-chair/chair-intro';
import { CHAIR_COPY } from '@/components/practices/the-empty-chair/content';
import { requireMemberAccessOrRedirect } from '@/lib/auth-api';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: CHAIR_COPY.title,
  description: `${CHAIR_COPY.subtitle}. A guided reflection, ${CHAIR_COPY.durationLabel}.`,
  path: '/dashboard/practices/the-empty-chair',
  noIndex: true,
});

/** Screen 1 of The Empty Chair. The Academy shell is covered by the practice's own calm frame. */
export default async function TheEmptyChairPage() {
  await requireMemberAccessOrRedirect();
  return <ChairIntro />;
}
