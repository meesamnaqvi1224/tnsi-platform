import { describe, expect, it } from 'vitest';
import {
  authorizeEntitlement,
  assertEntitlement,
  hasMemberAccess,
  assertMemberAccess,
  type EntitlementRecord,
} from './entitlements';
import { EntitlementRequiredError } from '../errors/auth';

function entitlement(overrides: Partial<EntitlementRecord> = {}): EntitlementRecord {
  return {
    status: 'active',
    programs: [],
    certifications: [],
    features: [],
    ...overrides,
  };
}

describe('authorizeEntitlement', () => {
  it('allows a free user when no protected requirement is given', () => {
    const result = authorizeEntitlement(entitlement({ status: 'active' }), { type: 'free' });
    expect(result).toEqual({ allowed: true, reason: null });
  });

  it('allows a free requirement even with no entitlement row at all', () => {
    const result = authorizeEntitlement(null, { type: 'free' });
    expect(result).toEqual({ allowed: true, reason: null });
  });

  it('denies a free user (empty programs array) a required programme', () => {
    const result = authorizeEntitlement(entitlement({ programs: [] }), {
      type: 'programme',
      programId: 'practitioner-certification',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('PROGRAMME_NOT_ENTITLED');
  });

  it('allows a user with the matching programme and active status', () => {
    const result = authorizeEntitlement(
      entitlement({ status: 'active', programs: ['practitioner-certification'] }),
      { type: 'programme', programId: 'practitioner-certification' },
    );
    expect(result).toEqual({ allowed: true, reason: null });
  });

  it('denies a user without the matching programme', () => {
    const result = authorizeEntitlement(
      entitlement({ status: 'active', programs: ['executive-advisory'] }),
      { type: 'programme', programId: 'practitioner-certification' },
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('PROGRAMME_NOT_ENTITLED');
  });

  it('allows a user with the matching certification and active status', () => {
    const result = authorizeEntitlement(
      entitlement({ status: 'active', certifications: ['practitioner-certified'] }),
      { type: 'certification', certificationId: 'practitioner-certified' },
    );
    expect(result).toEqual({ allowed: true, reason: null });
  });

  it('denies a user without the matching certification', () => {
    const result = authorizeEntitlement(entitlement({ status: 'active', certifications: [] }), {
      type: 'certification',
      certificationId: 'practitioner-certified',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('CERTIFICATION_NOT_ENTITLED');
  });

  it('denies a matching programme when the entitlement has expired', () => {
    const result = authorizeEntitlement(
      entitlement({ status: 'expired', programs: ['practitioner-certification'] }),
      { type: 'programme', programId: 'practitioner-certification' },
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('STATUS_NOT_ELIGIBLE');
  });

  it('allows a matching programme while the entitlement is trialing', () => {
    const result = authorizeEntitlement(
      entitlement({ status: 'trialing', programs: ['practitioner-certification'] }),
      { type: 'programme', programId: 'practitioner-certification' },
    );
    expect(result).toEqual({ allowed: true, reason: null });
  });

  it('does not grant access via an unrelated programme or certification', () => {
    const record = entitlement({
      status: 'active',
      programs: ['executive-advisory'],
      certifications: ['some-other-cert'],
    });

    expect(
      authorizeEntitlement(record, {
        type: 'programme',
        programId: 'practitioner-certification',
      }).allowed,
    ).toBe(false);

    expect(
      authorizeEntitlement(record, {
        type: 'certification',
        certificationId: 'practitioner-certified',
      }).allowed,
    ).toBe(false);
  });

  it('denies protected access when there is no entitlement row', () => {
    const result = authorizeEntitlement(null, {
      type: 'programme',
      programId: 'practitioner-certification',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('NO_ENTITLEMENT');
  });

  it('denies past_due status without assuming a grace period', () => {
    const result = authorizeEntitlement(
      entitlement({ status: 'past_due', programs: ['practitioner-certification'] }),
      { type: 'programme', programId: 'practitioner-certification' },
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('STATUS_NOT_ELIGIBLE');
  });

  it('denies canceled status without assuming current-period access continues', () => {
    const result = authorizeEntitlement(
      entitlement({ status: 'canceled', programs: ['practitioner-certification'] }),
      { type: 'programme', programId: 'practitioner-certification' },
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('STATUS_NOT_ELIGIBLE');
  });

  it('allows a feature when present and status-eligible, denies otherwise', () => {
    const withFeature = entitlement({ status: 'active', features: ['ai-guidance'] });
    expect(
      authorizeEntitlement(withFeature, { type: 'feature', featureId: 'ai-guidance' }).allowed,
    ).toBe(true);

    const withoutFeature = entitlement({ status: 'active', features: [] });
    expect(
      authorizeEntitlement(withoutFeature, { type: 'feature', featureId: 'ai-guidance' }).allowed,
    ).toBe(false);
  });

  it('is deterministic across repeated calls with the same input', () => {
    const record = entitlement({ status: 'active', programs: ['practitioner-certification'] });
    const requirement = { type: 'programme', programId: 'practitioner-certification' } as const;

    const results = Array.from({ length: 5 }, () => authorizeEntitlement(record, requirement));
    expect(new Set(results.map((r) => JSON.stringify(r))).size).toBe(1);
  });
});

describe('assertEntitlement', () => {
  it('returns normally (does not throw) when the requirement is satisfied', () => {
    expect(() =>
      assertEntitlement(entitlement({ status: 'active' }), { type: 'free' }),
    ).not.toThrow();
  });

  it('throws EntitlementRequiredError (403) when the requirement is not satisfied', () => {
    expect(() =>
      assertEntitlement(null, { type: 'programme', programId: 'practitioner-certification' }),
    ).toThrow(EntitlementRequiredError);
  });

  it('the thrown error carries the denial reason but never the raw entitlement contents', () => {
    try {
      assertEntitlement(entitlement({ status: 'expired', programs: ['x'] }), {
        type: 'programme',
        programId: 'x',
      });
      throw new Error('expected assertEntitlement to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(EntitlementRequiredError);
      const authErr = err as EntitlementRequiredError;
      expect(authErr.statusCode).toBe(403);
      expect(authErr.details?.reason).toBe('STATUS_NOT_ELIGIBLE');
      // Only the requirement type and denial reason are carried - never the
      // full entitlement record (programs/certifications/features/status).
      expect(JSON.stringify(authErr.details)).not.toContain('expired');
    }
  });
});

describe('hasMemberAccess', () => {
  it('allows an active entitlement (Active user)', () => {
    expect(hasMemberAccess(entitlement({ status: 'active' }))).toBe(true);
  });

  it('allows a trialing entitlement', () => {
    expect(hasMemberAccess(entitlement({ status: 'trialing' }))).toBe(true);
  });

  it('denies a canceled/expired/past_due entitlement (Inactive user)', () => {
    expect(hasMemberAccess(entitlement({ status: 'canceled' }))).toBe(false);
    expect(hasMemberAccess(entitlement({ status: 'expired' }))).toBe(false);
    expect(hasMemberAccess(entitlement({ status: 'past_due' }))).toBe(false);
  });

  it('denies when there is no entitlement row at all (fails closed)', () => {
    expect(hasMemberAccess(null)).toBe(false);
  });

  it('ignores tier entirely - member access is a status question, not a billing-plan question', () => {
    // No `tier` field exists on EntitlementRecord at all (deliberately -
    // see the module's own comment); this just documents that a free-tier
    // user with active status has member access, same as any other tier.
    expect(hasMemberAccess(entitlement({ status: 'active' }))).toBe(true);
  });
});

describe('assertMemberAccess', () => {
  it('returns normally for an active entitlement', () => {
    expect(() => assertMemberAccess(entitlement({ status: 'active' }))).not.toThrow();
  });

  it('throws EntitlementRequiredError (403) for an inactive entitlement, never for a client-supplied claim', () => {
    // The whole point: nothing about the *shape* of the input lets a caller
    // fake their way to `true` - this is a plain status check against a
    // server-fetched record, not a client-provided boolean.
    expect(() => assertMemberAccess(entitlement({ status: 'canceled' }))).toThrow(
      EntitlementRequiredError,
    );
  });

  it('throws for a missing entitlement row', () => {
    expect(() => assertMemberAccess(null)).toThrow(EntitlementRequiredError);
  });

  it('thrown error is a 403, distinct from an authentication (401) failure', () => {
    try {
      assertMemberAccess(entitlement({ status: 'expired' }));
      throw new Error('expected assertMemberAccess to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(EntitlementRequiredError);
      expect((err as EntitlementRequiredError).statusCode).toBe(403);
    }
  });
});
