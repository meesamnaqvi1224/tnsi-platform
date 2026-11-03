import { ChairComplete } from '@/components/practices/the-empty-chair/chair-complete';
import { requireMemberAccessOrRedirect } from '@/lib/auth-api';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'The Empty Chair complete',
  description: 'You took your seat.',
  path: '/dashboard/practices/the-empty-chair/complete',
  noIndex: true,
});

/** Screen 3 of The Empty Chair: a quiet close. */
export default async function TheEmptyChairCompletePage() {
  await requireMemberAccessOrRedirect();
  return <ChairComplete />;
}
