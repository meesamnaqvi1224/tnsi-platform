import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  buildEligibilityKeys,
  deriveEmailKey,
  InvalidEmailError,
  loadTrialKeyConfig,
  normaliseEmail,
  rekeyPlan,
  requireVerifiedPrimaryEmail,
  TrialKeyConfigError,
  UnverifiedEmailError,
  type TrialKeyConfig,
} from './email';

const SECRET_V1 = 'k1_Zm9vYmFyYmF6cXV4cXV1eHF1dXhxdXV4MTIzNDU2Nzg5MA==';
const SECRET_V2 = 'k2_YW5vdGhlci1zZWNyZXQtdmFsdWUtMDEyMzQ1Njc4OS1hYmNkZWY=';
const ENV = {
  TRIAL_ELIGIBILITY_SECRET: SECRET_V2,
  TRIAL_ELIGIBILITY_KEY_VERSION: '2',
  TRIAL_ELIGIBILITY_PREVIOUS_KEYS: `1:${SECRET_V1}`,
};
const CONFIG: TrialKeyConfig = loadTrialKeyConfig(ENV);

describe('normaliseEmail', () => {
  it('trims and lowercases', () => {
    expect(normaliseEmail('  Jane.Doe@Example.COM \n')).toBe('jane.doe@example.com');
  });

  it('applies Unicode NFKC (fullwidth and compatibility forms)', () => {
    expect(normaliseEmail('ＪＡＮＥ@ＥＸＡＭＰＬＥ.ＣＯＭ')).toBe('jane@example.com');
    expect(normaliseEmail('jane@exaﬁ.com')).toBe('jane@exafi.com'); // ﬁ ligature -> fi
  });

  it('trims Unicode whitespace as well as ASCII', () => {
    expect(normaliseEmail(' 　jane@example.com ')).toBe('jane@example.com');
  });

  it('does NOT strip plus tags or Gmail dots', () => {
    expect(normaliseEmail('Jane.Doe+promo@Gmail.com')).toBe('jane.doe+promo@gmail.com');
    expect(normaliseEmail('janedoe@gmail.com')).not.toBe(normaliseEmail('jane.doe@gmail.com'));
    expect(normaliseEmail('a+1@x.com')).not.toBe(normaliseEmail('a@x.com'));
  });

  it('does not rewrite googlemail.com to gmail.com', () => {
    expect(normaliseEmail('a@googlemail.com')).toBe('a@googlemail.com');
  });

  it('is idempotent', () => {
    for (const raw of [
      '  Mixed.Case@Example.COM ',
      'ＦＵＬＬ@ＷＩＤＴＨ.ｃｏｍ',
      'İstanbul@örnek.com',
    ]) {
      const once = normaliseEmail(raw);
      expect(normaliseEmail(once)).toBe(once);
    }
  });

  it.each(['', '   ', 'no-at-sign', '@example.com', 'jane@', 'a@b@c.com'])('rejects %j', (raw) => {
    expect(() => normaliseEmail(raw)).toThrow(InvalidEmailError);
  });

  it('rejects non-strings', () => {
    expect(() => normaliseEmail(undefined as unknown as string)).toThrow(InvalidEmailError);
  });
});

describe('deriveEmailKey', () => {
  it('is deterministic 64-character lowercase hex', () => {
    const a = deriveEmailKey('jane@example.com', SECRET_V1);
    expect(a).toBe(deriveEmailKey('jane@example.com', SECRET_V1));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('matches an independently computed HMAC-SHA-256 (domain-separated)', () => {
    const expected = createHmac('sha256', SECRET_V1)
      .update('tnsi:trial-eligibility:v1\0jane@example.com')
      .digest('hex');
    expect(deriveEmailKey('jane@example.com', SECRET_V1)).toBe(expected);
  });

  it('is not a plain unsalted hash or an un-labelled HMAC of the email', () => {
    const unlabelled = createHmac('sha256', SECRET_V1).update('jane@example.com').digest('hex');
    expect(deriveEmailKey('jane@example.com', SECRET_V1)).not.toBe(unlabelled);
  });

  it('differs per email and per secret', () => {
    const base = deriveEmailKey('jane@example.com', SECRET_V1);
    expect(deriveEmailKey('john@example.com', SECRET_V1)).not.toBe(base);
    expect(deriveEmailKey('jane@example.com', SECRET_V2)).not.toBe(base);
  });

  it('never contains the email address', () => {
    expect(deriveEmailKey('jane@example.com', SECRET_V1)).not.toContain('jane');
  });
});

describe('loadTrialKeyConfig - fails closed', () => {
  it('loads a valid current key and previous keys', () => {
    expect(CONFIG.current).toEqual({ version: 2, secret: SECRET_V2 });
    expect(CONFIG.previous).toEqual([{ version: 1, secret: SECRET_V1 }]);
  });

  it('works with no previous keys', () => {
    const config = loadTrialKeyConfig({
      TRIAL_ELIGIBILITY_SECRET: SECRET_V1,
      TRIAL_ELIGIBILITY_KEY_VERSION: '1',
    });
    expect(config.previous).toEqual([]);
  });

  it.each([
    ['missing secret', { TRIAL_ELIGIBILITY_KEY_VERSION: '1' }],
    ['blank secret', { TRIAL_ELIGIBILITY_SECRET: '   ', TRIAL_ELIGIBILITY_KEY_VERSION: '1' }],
    ['missing version', { TRIAL_ELIGIBILITY_SECRET: SECRET_V1 }],
    ['blank version', { TRIAL_ELIGIBILITY_SECRET: SECRET_V1, TRIAL_ELIGIBILITY_KEY_VERSION: '' }],
    [
      'non-numeric version',
      { TRIAL_ELIGIBILITY_SECRET: SECRET_V1, TRIAL_ELIGIBILITY_KEY_VERSION: 'v1' },
    ],
    ['zero version', { TRIAL_ELIGIBILITY_SECRET: SECRET_V1, TRIAL_ELIGIBILITY_KEY_VERSION: '0' }],
    [
      'version beyond smallint',
      { TRIAL_ELIGIBILITY_SECRET: SECRET_V1, TRIAL_ELIGIBILITY_KEY_VERSION: '32768' },
    ],
    ['short secret', { TRIAL_ELIGIBILITY_SECRET: 'too-short', TRIAL_ELIGIBILITY_KEY_VERSION: '1' }],
    [
      'unsupported characters',
      { TRIAL_ELIGIBILITY_SECRET: `${SECRET_V1} spaced!`, TRIAL_ELIGIBILITY_KEY_VERSION: '1' },
    ],
    ['malformed previous entry', { ...ENV, TRIAL_ELIGIBILITY_PREVIOUS_KEYS: SECRET_V1 }],
    ['previous entry with short secret', { ...ENV, TRIAL_ELIGIBILITY_PREVIOUS_KEYS: '1:short' }],
    [
      'previous version equal to current',
      { ...ENV, TRIAL_ELIGIBILITY_PREVIOUS_KEYS: `2:${SECRET_V1}` },
    ],
    [
      'duplicate previous versions',
      { ...ENV, TRIAL_ELIGIBILITY_PREVIOUS_KEYS: `1:${SECRET_V1},1:${SECRET_V1}` },
    ],
  ])('throws for %s', (_label, env) => {
    expect(() => loadTrialKeyConfig(env as Record<string, string>)).toThrow(TrialKeyConfigError);
  });

  it('never puts a secret value in an error message', () => {
    const attempts = [
      { TRIAL_ELIGIBILITY_SECRET: `${SECRET_V1} spaced!`, TRIAL_ELIGIBILITY_KEY_VERSION: '1' },
      { ...ENV, TRIAL_ELIGIBILITY_PREVIOUS_KEYS: `2:${SECRET_V1}` },
      { TRIAL_ELIGIBILITY_SECRET: 'tooshort', TRIAL_ELIGIBILITY_KEY_VERSION: '1' },
    ];
    for (const env of attempts) {
      try {
        loadTrialKeyConfig(env);
        throw new Error('expected a throw');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).not.toContain(SECRET_V1);
        expect(message).not.toContain(SECRET_V2);
        expect(message).not.toContain('tooshort');
      }
    }
  });
});

describe('buildEligibilityKeys - versions and rotation', () => {
  it('writes under the current version and looks up under every active version, current first', () => {
    const keys = buildEligibilityKeys('Jane@Example.com', CONFIG);
    expect(keys.current.version).toBe(2);
    expect(keys.lookup.map((k) => k.version)).toEqual([2, 1]);
    expect(keys.lookup[0]).toEqual(keys.current);
    expect(keys.current.key).toBe(deriveEmailKey('jane@example.com', SECRET_V2));
    expect(keys.lookup[1]!.key).toBe(deriveEmailKey('jane@example.com', SECRET_V1));
  });

  it('is case/whitespace-insensitive for the same person', () => {
    expect(buildEligibilityKeys('  JANE@example.com ', CONFIG)).toEqual(
      buildEligibilityKeys('jane@example.com', CONFIG),
    );
  });

  it('an existing claim stays discoverable after rotation while the old version is active', () => {
    const before = loadTrialKeyConfig({
      TRIAL_ELIGIBILITY_SECRET: SECRET_V1,
      TRIAL_ELIGIBILITY_KEY_VERSION: '1',
    });
    const claimKey = buildEligibilityKeys('jane@example.com', before).current.key;
    const after = buildEligibilityKeys('jane@example.com', CONFIG);
    expect(after.lookup.map((k) => k.key)).toContain(claimKey);
  });

  it('a claim is NOT discoverable once its version is dropped (why retirement is gated)', () => {
    const before = loadTrialKeyConfig({
      TRIAL_ELIGIBILITY_SECRET: SECRET_V1,
      TRIAL_ELIGIBILITY_KEY_VERSION: '1',
    });
    const claimKey = buildEligibilityKeys('jane@example.com', before).current.key;
    const dropped = loadTrialKeyConfig({
      TRIAL_ELIGIBILITY_SECRET: SECRET_V2,
      TRIAL_ELIGIBILITY_KEY_VERSION: '2',
    });
    expect(
      buildEligibilityKeys('jane@example.com', dropped).lookup.map((k) => k.key),
    ).not.toContain(claimKey);
  });

  it('plans a re-key only for claims under an older version', () => {
    const keys = buildEligibilityKeys('jane@example.com', CONFIG);
    const old = keys.lookup[1]!;
    expect(rekeyPlan({ emailKey: old.key, keyVersion: 1 }, keys)).toEqual({
      rekey: true,
      fromKey: old.key,
      toKey: keys.current.key,
      toVersion: 2,
    });
    expect(rekeyPlan({ emailKey: keys.current.key, keyVersion: 2 }, keys)).toEqual({
      rekey: false,
    });
  });

  it('errors never contain the email or its derived key', () => {
    const keys = buildEligibilityKeys('jane@example.com', CONFIG);
    try {
      buildEligibilityKeys('not-an-email', CONFIG);
      throw new Error('expected a throw');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).not.toContain('jane');
      expect(message).not.toContain(keys.current.key);
    }
  });
});

describe('requireVerifiedPrimaryEmail', () => {
  const verified = {
    id: 'e1',
    emailAddress: 'Jane@Example.com',
    verification: { status: 'verified' },
  };

  it('returns the primary address when the provider says it is verified', () => {
    expect(
      requireVerifiedPrimaryEmail({ primaryEmailAddressId: 'e1', emailAddresses: [verified] }),
    ).toBe('Jane@Example.com');
  });

  it.each([
    [
      'unverified primary',
      { id: 'e1', emailAddress: 'a@b.com', verification: { status: 'unverified' } },
    ],
    ['primary with no verification object', { id: 'e1', emailAddress: 'a@b.com' }],
    [
      'verification pending',
      { id: 'e1', emailAddress: 'a@b.com', verification: { status: 'pending' } },
    ],
    ['verification null', { id: 'e1', emailAddress: 'a@b.com', verification: null }],
  ])('refuses %s', (_label, email) => {
    expect(() =>
      requireVerifiedPrimaryEmail({ primaryEmailAddressId: 'e1', emailAddresses: [email] }),
    ).toThrow(UnverifiedEmailError);
  });

  it('refuses when there is no primary address, even if another address is verified', () => {
    expect(() =>
      requireVerifiedPrimaryEmail({ primaryEmailAddressId: null, emailAddresses: [verified] }),
    ).toThrow(UnverifiedEmailError);
  });

  it('never substitutes another verified address for an unverified primary', () => {
    expect(() =>
      requireVerifiedPrimaryEmail({
        primaryEmailAddressId: 'e2',
        emailAddresses: [
          verified,
          { id: 'e2', emailAddress: 'primary@x.com', verification: { status: 'unverified' } },
        ],
      }),
    ).toThrow(UnverifiedEmailError);
  });

  it('refuses a primary id that matches no address', () => {
    expect(() =>
      requireVerifiedPrimaryEmail({ primaryEmailAddressId: 'missing', emailAddresses: [verified] }),
    ).toThrow(UnverifiedEmailError);
  });
});
