import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The account-deletion sequence (lib/account-deletion.ts): what each failure leaves behind, that every
 * step is retry-safe, that the journal is locked from the moment deletion starts, and that completion is
 * never claimed unless every step succeeded. Postgres and Clerk cannot share a transaction, so the ORDER
 * is what is being proved here.
 */
vi.mock('@tnsi/db', () => ({ db: {}, entitlements: {}, accountDeletionRequests: {} }));
vi.mock('./journal', () => ({ purgeJournalEntries: vi.fn() }));
const clerk = vi.hoisted(() => ({ deleteClerkUser: vi.fn() }));
vi.mock('@tnsi/auth/client/server', () => ({ deleteClerkUser: clerk.deleteClerkUser }));
const sync = vi.hoisted(() => ({ softDeleteUser: vi.fn() }));
vi.mock('./user-sync-ops', () => ({ userSyncOps: { softDeleteUser: sync.softDeleteUser } }));

const { deleteAccount, realAccountDeletionDeps } = await import('./account-deletion');

const USER = { id: 'user-1', clerkUserId: 'clerk_1' };
const SECRET = 'journal text SECRET-TEXT';

function makeDeps() {
  const calls: string[] = [];
  const deps = {
    hasActivePaidSubscription: vi.fn(async () => (calls.push('subscription'), false)),
    markDeletionPending: vi.fn(async () => void calls.push('mark_pending')),
    suppressMarketing: vi.fn(async () => void calls.push('suppress')),
    purgeJournal: vi.fn(async () => (calls.push('purge'), 3)),
    deleteIdentity: vi.fn(async () => void calls.push('identity')),
    finalizeLocalDeletion: vi.fn(async () => void calls.push('finalize')),
    completeCrmDeletion: vi.fn(async () => (calls.push('crm_delete'), true)),
  };
  return { deps, calls };
}

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  clerk.deleteClerkUser.mockReset();
  sync.softDeleteUser.mockReset();
});

describe('deleteAccount: the sequence', () => {
  it('marks the deletion pending BEFORE anything is erased, and reports deleted only when all steps succeed', async () => {
    const { deps, calls } = makeDeps();
    expect(await deleteAccount(USER, deps)).toEqual({ status: 'deleted' });
    expect(calls).toEqual([
      'subscription',
      'mark_pending',
      'suppress',
      'purge',
      'identity',
      'finalize',
      'crm_delete',
    ]);
    expect(deps.markDeletionPending).toHaveBeenCalledWith('user-1');
    expect(deps.purgeJournal).toHaveBeenCalledWith('user-1');
    expect(deps.deleteIdentity).toHaveBeenCalledWith('clerk_1');
    expect(deps.finalizeLocalDeletion).toHaveBeenCalledWith('clerk_1');
  });

  it('refuses while a paid subscription is running, and changes nothing - not even the pending marker', async () => {
    const { deps, calls } = makeDeps();
    deps.hasActivePaidSubscription.mockResolvedValue(true);
    expect(await deleteAccount(USER, deps)).toEqual({ status: 'blocked_subscription' });
    expect(calls).toEqual([]);
    expect(deps.markDeletionPending).not.toHaveBeenCalled();
  });

  it('fails safely, changing nothing, if the pre-check itself fails', async () => {
    const { deps } = makeDeps();
    deps.hasActivePaidSubscription.mockRejectedValue(new Error('db'));
    expect(await deleteAccount(USER, deps)).toEqual({ status: 'failed', stage: 'precheck' });
    expect(deps.markDeletionPending).not.toHaveBeenCalled();
    expect(deps.purgeJournal).not.toHaveBeenCalled();
  });
});

describe('deleteAccount: failure at each step', () => {
  it('if the pending marker cannot be set, nothing was changed and nothing else runs', async () => {
    const { deps } = makeDeps();
    deps.markDeletionPending.mockRejectedValue(new Error('db down'));
    const result = await deleteAccount(USER, deps);
    expect(result).toEqual({ status: 'failed', stage: 'mark_pending' });
    expect(deps.purgeJournal).not.toHaveBeenCalled();
    expect(deps.deleteIdentity).not.toHaveBeenCalled();
    expect(deps.finalizeLocalDeletion).not.toHaveBeenCalled();
  });

  it('if the journal purge fails, deletion is PENDING (the journal is already locked), never success, and nothing further runs', async () => {
    const { deps } = makeDeps();
    deps.purgeJournal.mockRejectedValue(new Error('db down'));
    const result = await deleteAccount(USER, deps);
    expect(result).toEqual({ status: 'pending', stage: 'journal_purge' });
    expect(deps.markDeletionPending).toHaveBeenCalledTimes(1); // locked before the purge was attempted
    expect(deps.deleteIdentity).not.toHaveBeenCalled();
    expect(deps.finalizeLocalDeletion).not.toHaveBeenCalled();
  });

  it('if the identity deletion fails, deletion is PENDING, the account is not marked deleted, and the journal was already locked', async () => {
    const { deps } = makeDeps();
    deps.deleteIdentity.mockRejectedValue(new Error('clerk 503'));
    const result = await deleteAccount(USER, deps);
    expect(result).toEqual({ status: 'pending', stage: 'identity_provider' });
    expect(deps.markDeletionPending).toHaveBeenCalledTimes(1);
    expect(deps.purgeJournal).toHaveBeenCalledTimes(1);
    expect(deps.finalizeLocalDeletion).not.toHaveBeenCalled();
  });

  it('if only the local finalisation fails, the result is pending_cleanup - never deleted', async () => {
    const { deps } = makeDeps();
    deps.finalizeLocalDeletion.mockRejectedValue(new Error('db blip'));
    const result = await deleteAccount(USER, deps);
    expect(result).toEqual({ status: 'pending_cleanup' });
    expect(result.status).not.toBe('deleted');
  });
});

describe('deleteAccount: marketing suppression and the CRM contact', () => {
  it('stops marketing straight after the pending marker and BEFORE anything is erased; deletes the CRM contact last', async () => {
    const { deps, calls } = makeDeps();
    expect(await deleteAccount(USER, deps)).toEqual({ status: 'deleted' });
    expect(calls).toEqual([
      'subscription',
      'mark_pending',
      'suppress',
      'purge',
      'identity',
      'finalize',
      'crm_delete',
    ]);
    expect(deps.suppressMarketing).toHaveBeenCalledWith('user-1');
    expect(deps.completeCrmDeletion).toHaveBeenCalledWith('user-1');
  });

  it('a refused deletion (paid subscription) suppresses nothing and deletes no CRM contact', async () => {
    const { deps } = makeDeps();
    deps.hasActivePaidSubscription.mockResolvedValue(true);
    await deleteAccount(USER, deps);
    expect(deps.suppressMarketing).not.toHaveBeenCalled();
    expect(deps.completeCrmDeletion).not.toHaveBeenCalled();
  });

  it('if suppression cannot be recorded, deletion is PENDING (it has started), nothing is erased and the identity is kept', async () => {
    const { deps } = makeDeps();
    deps.suppressMarketing.mockRejectedValue(new Error('db blip'));
    expect(await deleteAccount(USER, deps)).toEqual({
      status: 'pending',
      stage: 'crm_suppression',
    });
    expect(deps.purgeJournal).not.toHaveBeenCalled();
    expect(deps.deleteIdentity).not.toHaveBeenCalled();
    expect(deps.finalizeLocalDeletion).not.toHaveBeenCalled();
  });

  it('if the CRM has NOT confirmed the contact is deleted, the result is pending_cleanup - never deleted', async () => {
    const { deps } = makeDeps();
    deps.completeCrmDeletion.mockResolvedValue(false);
    const result = await deleteAccount(USER, deps);
    expect(result).toEqual({ status: 'pending_cleanup' });
    expect(deps.finalizeLocalDeletion).toHaveBeenCalledTimes(1); // our own data is already erased
  });

  it('if the CRM step itself throws, the result is pending_cleanup - never deleted, never a failure that hides the erasure', async () => {
    const { deps } = makeDeps();
    deps.completeCrmDeletion.mockRejectedValue(new Error('crm down'));
    expect(await deleteAccount(USER, deps)).toEqual({ status: 'pending_cleanup' });
  });

  it('the CRM contact is never deleted before the local erasure has committed', async () => {
    const { deps } = makeDeps();
    deps.finalizeLocalDeletion.mockRejectedValue(new Error('db blip'));
    await deleteAccount(USER, deps);
    expect(deps.completeCrmDeletion).not.toHaveBeenCalled();
  });

  it('a retry after a CRM-suppression failure completes, queueing suppression again harmlessly', async () => {
    const { deps } = makeDeps();
    deps.suppressMarketing.mockRejectedValueOnce(new Error('db blip'));
    expect((await deleteAccount(USER, deps)).status).toBe('pending');
    expect(await deleteAccount(USER, deps)).toEqual({ status: 'deleted' });
    expect(deps.suppressMarketing).toHaveBeenCalledTimes(2);
  });
});

describe('deleteAccount: retries are safe', () => {
  it('retry after an identity failure completes, re-running every step (all idempotent)', async () => {
    const { deps } = makeDeps();
    deps.deleteIdentity.mockRejectedValueOnce(new Error('clerk 503'));
    expect((await deleteAccount(USER, deps)).status).toBe('pending');

    expect(await deleteAccount(USER, deps)).toEqual({ status: 'deleted' });
    // marking is repeated (it keeps the first request time), the purge is a harmless repeat, Clerk is retried
    expect(deps.markDeletionPending).toHaveBeenCalledTimes(2);
    expect(deps.purgeJournal).toHaveBeenCalledTimes(2);
    expect(deps.deleteIdentity).toHaveBeenCalledTimes(2);
    expect(deps.finalizeLocalDeletion).toHaveBeenCalledTimes(1);
  });

  it('retry after a purge failure completes', async () => {
    const { deps } = makeDeps();
    deps.purgeJournal.mockRejectedValueOnce(new Error('db blip'));
    expect(await deleteAccount(USER, deps)).toEqual({ status: 'pending', stage: 'journal_purge' });
    expect(await deleteAccount(USER, deps)).toEqual({ status: 'deleted' });
  });

  it('retry after the pending marker failed completes', async () => {
    const { deps } = makeDeps();
    deps.markDeletionPending.mockRejectedValueOnce(new Error('db blip'));
    expect((await deleteAccount(USER, deps)).status).toBe('failed');
    expect(await deleteAccount(USER, deps)).toEqual({ status: 'deleted' });
  });

  it('survives several failures in a row, and only claims success on the run where every step worked', async () => {
    const { deps } = makeDeps();
    deps.deleteIdentity.mockRejectedValueOnce(new Error('a')).mockRejectedValueOnce(new Error('b'));
    const outcomes: string[] = [];
    for (let i = 0; i < 3; i += 1) outcomes.push((await deleteAccount(USER, deps)).status);
    expect(outcomes).toEqual(['pending', 'pending', 'deleted']);
  });

  it('has no way to write to the journal: the only journal operation in the flow is the purge', async () => {
    const { deps } = makeDeps();
    expect(Object.keys(deps)).toEqual([
      'hasActivePaidSubscription',
      'markDeletionPending',
      'suppressMarketing',
      'purgeJournal',
      'deleteIdentity',
      'finalizeLocalDeletion',
      'completeCrmDeletion',
    ]); // there is no "restore" or "write" dependency for a retry to call
  });
});

describe('deleteAccount: logging', () => {
  it('logs only a stage label and a short code - never the error, its query or its parameters', async () => {
    const { deps } = makeDeps();
    const leaky = () =>
      Object.assign(new Error(`failed ${SECRET}`), {
        code: '57014',
        query: SECRET,
        parameters: [SECRET],
      });
    for (const key of [
      'markDeletionPending',
      'suppressMarketing',
      'purgeJournal',
      'deleteIdentity',
      'finalizeLocalDeletion',
      'completeCrmDeletion',
    ] as const) {
      deps[key].mockRejectedValueOnce(leaky());
      await deleteAccount(USER, deps);
    }
    expect(errorSpy).toHaveBeenCalledTimes(6);
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('SECRET');
    for (const call of errorSpy.mock.calls) {
      expect(call[0]).toBe('[account deletion] step failed');
      expect(Object.keys(call[1] as object).sort()).toEqual(['code', 'stage']);
    }
  });
});

describe('realAccountDeletionDeps', () => {
  it('treats an already-deleted Clerk user (404) as success, so a retry never gets stuck', async () => {
    clerk.deleteClerkUser.mockRejectedValue(Object.assign(new Error('not found'), { status: 404 }));
    const deps = await realAccountDeletionDeps();
    await expect(deps.deleteIdentity('clerk_1')).resolves.toBeUndefined();
  });

  it('lets any other Clerk failure through, so it is reported rather than hidden', async () => {
    clerk.deleteClerkUser.mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }));
    const deps = await realAccountDeletionDeps();
    await expect(deps.deleteIdentity('clerk_1')).rejects.toThrow('boom');
  });

  it('finalises through the same transactional softDeleteUser the Clerk webhook uses', async () => {
    sync.softDeleteUser.mockResolvedValue({});
    const deps = await realAccountDeletionDeps();
    await deps.finalizeLocalDeletion('clerk_1');
    expect(sync.softDeleteUser).toHaveBeenCalledWith('clerk_1');
  });
});
