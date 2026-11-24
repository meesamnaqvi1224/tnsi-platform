import { afterEach, describe, expect, it, vi } from 'vitest';
import { followUpOfCheckIn } from './check-in-follow-up';

const grow = { v: 1, path: 'grow', growArea: 'participation' };

afterEach(() => vi.unstubAllEnvs());

describe('followUpOfCheckIn', () => {
  it('is null while the feature is off, whatever is stored', () => {
    expect(followUpOfCheckIn({ capacityScore: 4, metadata: { followUp: grow } })).toBeNull();
  });

  it('reads a stored answer when the feature is on', () => {
    vi.stubEnv('CHECKIN_FOLLOW_UP_ENABLED', 'true');
    expect(followUpOfCheckIn({ capacityScore: 4, metadata: { followUp: grow } })).toEqual(grow);
  });

  it('is null for a missing check-in, no answer, or unusable metadata', () => {
    vi.stubEnv('CHECKIN_FOLLOW_UP_ENABLED', 'true');
    expect(followUpOfCheckIn(null)).toBeNull();
    expect(followUpOfCheckIn(undefined)).toBeNull();
    expect(followUpOfCheckIn({ capacityScore: 4, metadata: {} })).toBeNull();
    expect(followUpOfCheckIn({ capacityScore: 4, metadata: null })).toBeNull();
    expect(followUpOfCheckIn({ capacityScore: 4, metadata: [] })).toBeNull();
    expect(followUpOfCheckIn({ capacityScore: 4, metadata: { followUp: 'x' } })).toBeNull();
  });

  it('is null when the stored answer does not fit the first answer', () => {
    vi.stubEnv('CHECKIN_FOLLOW_UP_ENABLED', 'true');
    expect(followUpOfCheckIn({ capacityScore: 1, metadata: { followUp: grow } })).toBeNull();
  });
});
