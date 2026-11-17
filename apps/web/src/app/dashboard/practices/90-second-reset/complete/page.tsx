import { ResetComplete } from '@/components/practices/ninety-second-reset/reset-complete';
import { requireMemberAccessOrRedirect } from '@/lib/auth-api';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: '90-Second Reset complete',
  description: 'You’ve made a little space.',
  path: '/dashboard/practices/90-second-reset/complete',
  noIndex: true,
});

/** Screen 3 of the 90-Second Reset: a quiet close. */
export default async function NinetySecondResetCompletePage() {
  await requireMemberAccessOrRedirect();
  return <ResetComplete />;
}
