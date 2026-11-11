import { describe, expect, it } from 'vitest';
import { canCheckInAgain, savedCheckInKind } from './additional-check-in';

describe('canCheckInAgain', () => {
  it('is offered only for a primary check-in from a server that reports the flag', () => {
    expect(canCheckInAgain({ isPrimary: true })).toBe(true);
  });
  it('is not offered by an older server (no flag) or for a non-primary row', () => {
    expect(canCheckInAgain({})).toBe(false);
    expect(canCheckInAgain({ isPrimary: false })).toBe(false);
  });
});

describe('savedCheckInKind', () => {
  it('is additional only when the server says so', () => {
    expect(savedCheckInKind({ isPrimary: false })).toBe('additional');
  });
  it('treats a primary, or an unflagged (older server) row, as the primary', () => {
    expect(savedCheckInKind({ isPrimary: true })).toBe('primary');
    expect(savedCheckInKind({})).toBe('primary');
  });
});
