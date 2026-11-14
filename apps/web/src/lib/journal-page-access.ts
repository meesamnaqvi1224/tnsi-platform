import { redirect } from 'next/navigation';
import {
  AccountDeletionPendingError,
  DeletionStateUnavailableError,
  requireJournalAccess,
} from '@/lib/journal-access';

/**
 * The same access rule the journal API applies (a signed-in member whose account deletion is not
 * pending), for the journal's server-rendered pages. Returns a state instead of throwing so a page can
 * show a calm message: `locked` when an account deletion is in progress, `unavailable` when that could
 * not be checked (the journal fails closed either way). A signed-out visitor is sent to sign in.
 */
export async function getJournalPageAccess(): Promise<
  { state: 'ok'; userId: string } | { state: 'locked' } | { state: 'unavailable' }
> {
  try {
    const user = await requireJournalAccess();
    return { state: 'ok', userId: user.id };
  } catch (error) {
    if (error instanceof AccountDeletionPendingError) return { state: 'locked' };
    if (error instanceof DeletionStateUnavailableError) return { state: 'unavailable' };
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') redirect('/sign-in');
    throw error;
  }
}
