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

describe('canCheckInAgain when every check-in drives the suggestions', () => {
  it('is offered after any check-in a new server marks, including an additional one', () => {
    expect(canCheckInAgain({ isPrimary: true }, true)).toBe(true);
    expect(canCheckInAgain({ isPrimary: false }, true)).toBe(true);
  });
  it('is still not offered by an older server that sends no flag', () => {
    expect(canCheckInAgain({}, true)).toBe(false);
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
