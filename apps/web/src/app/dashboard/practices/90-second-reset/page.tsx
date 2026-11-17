import { ResetIntro } from '@/components/practices/ninety-second-reset/reset-intro';
import { requireMemberAccessOrRedirect } from '@/lib/auth-api';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: '90-Second Reset',
  description: 'A moment to return to where you are.',
  path: '/dashboard/practices/90-second-reset',
  noIndex: true,
});

/** Screen 1 of the 90-Second Reset. The Academy shell is covered by the practice's own calm frame. */
export default async function NinetySecondResetPage() {
  await requireMemberAccessOrRedirect();
  return <ResetIntro />;
}
