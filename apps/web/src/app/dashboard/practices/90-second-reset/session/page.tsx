import { ResetSession } from '@/components/practices/ninety-second-reset/reset-session';
import { RESET_COPY } from '@/components/practices/ninety-second-reset/content';
import { requireMemberAccessOrRedirect } from '@/lib/auth-api';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: '90-Second Reset',
  description: `A guided pause, ${RESET_COPY.durationLabel}.`,
  path: '/dashboard/practices/90-second-reset/session',
  noIndex: true,
});

/** Screen 2 of the 90-Second Reset: the guided practice. */
export default async function NinetySecondResetSessionPage() {
  await requireMemberAccessOrRedirect();
  return <ResetSession />;
}
