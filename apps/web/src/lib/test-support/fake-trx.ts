/**
 * A minimal stand-in for the drizzle transaction handle, used by unit tests of
 * `refreshSubscription` / `reconcileMembership` that must not need a database.
 * It answers each `select()` from a queue of prepared row lists, records every
 * `update().set()`, and runs `runTransaction` callbacks inline (committing on
 * return, discarding recorded writes if the callback throws - like a rollback).
 *
 * It models nothing about SQL. Anything that depends on real locking, rollback
 * or constraints is covered against PostgreSQL in the *.integration.test.ts
 * files instead.
 */
export interface FakeTrx {
  selectQueue: Array<Array<Record<string, unknown>>>;
  committedSets: Array<Record<string, unknown>>;
  pendingSets: Array<Record<string, unknown>>;
  selectCalls: number;
  forUpdateCalls: number;
}

export function createFakeDb(initialSelects: Array<Array<Record<string, unknown>>> = []) {
  const state: FakeTrx = {
    selectQueue: [...initialSelects],
    committedSets: [],
    pendingSets: [],
    selectCalls: 0,
    forUpdateCalls: 0,
  };

  const trx = {
    select: () => {
      state.selectCalls += 1;
      const rows = state.selectQueue.shift() ?? [];
      const chain = {
        from: () => chain,
        where: () => chain,
        limit: () => chain,
        for: async () => {
          state.forUpdateCalls += 1;
          return rows;
        },
        then: (resolve: (value: unknown) => unknown) => resolve(rows),
      };
      return chain;
    },
    update: () => {
      const chain = {
        set: (values: Record<string, unknown>) => {
          state.pendingSets.push(values);
          return chain;
        },
        where: async () => [],
      };
      return chain;
    },
  };

  async function runTransaction<T>(fn: (t: never) => Promise<T>): Promise<T> {
    state.pendingSets = [];
    try {
      const result = await fn(trx as never);
      state.committedSets.push(...state.pendingSets);
      return result;
    } finally {
      state.pendingSets = [];
    }
  }

  return { state, runTransaction: runTransaction as never };
}
