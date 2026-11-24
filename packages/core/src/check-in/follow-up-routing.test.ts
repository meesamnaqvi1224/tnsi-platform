import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PROTECTION_PATTERN_IDS,
  isProtectionPatternId,
  parseFollowUpRouting,
  type FollowUpPick,
} from './follow-up-routing';

const REPO = path.resolve(__dirname, '../../../..');
const readJson = (rel: string) => JSON.parse(readFileSync(path.join(REPO, rel), 'utf8'));

const routingFile = readJson('packages/core/src/check-in/checkin-suggestions-v1.json');
const seedFile = readJson('content/protection-patterns-v1.json') as {
  somaticCards: Record<string, { patterns: string[]; confidence: string }>;
  powerDrops: Record<string, { patterns: string[]; confidence: string }>;
};

const cardSlugs = new Set<string>(
  ['core-series-01-05', 'core-series-06'].flatMap((f) =>
    (readJson(`content/somatic-cards/${f}.json`).cards as { slug: string }[]).map((c) => c.slug),
  ),
);
const dropSlugs = new Set<string>(
  (readJson('content/powerdrops/powerdrops-v1.json').powerDrops as { slug: string }[]).map(
    (d) => d.slug,
  ),
);
const exists = (pick: FollowUpPick) =>
  (pick.kind === 'somaticCard' ? cardSlugs : dropSlugs).has(pick.slug);

describe('protection patterns', () => {
  it('has the 13 agreed patterns, each once', () => {
    expect(PROTECTION_PATTERN_IDS).toHaveLength(13);
    expect(new Set(PROTECTION_PATTERN_IDS).size).toBe(13);
    expect(isProtectionPatternId('hypervigilance')).toBe(true);
    expect(isProtectionPatternId('stretch')).toBe(false);
  });

  it('matches the options offered in the CMS schema', () => {
    const source = readFileSync(
      path.join(REPO, 'packages/cms/src/schema/protectionPatternOptions.ts'),
      'utf8',
    );
    const inSchema = [...source.matchAll(/value: '([a-z-]+)'/g)].map((m) => m[1]);
    expect(inSchema).toEqual([...PROTECTION_PATTERN_IDS]);
  });
});

describe('check-in routing file (checkin-suggestions-v1.json)', () => {
  const routing = parseFollowUpRouting(routingFile);

  it('parses: all 13 patterns, two different picks each', () => {
    expect(routing).not.toBeNull();
    expect(routing!.patterns.map((p) => p.id).sort()).toEqual([...PROTECTION_PATTERN_IDS].sort());
  });

  it('points only at content that exists', () => {
    const picks = [...routing!.notSure, ...routing!.patterns.flatMap((p) => p.picks)];
    const missing = picks.filter((p) => !exists(p));
    expect(missing).toEqual([]);
  });

  it('offers the agreed fixed pair when the member is not sure', () => {
    expect(routing!.notSure.map((p) => p.slug)).toEqual([
      'the-physiological-sigh',
      'the-horizon-lock',
    ]);
  });

  it('rejects a table with a missing pattern', () => {
    const broken = { ...routingFile, patterns: routingFile.patterns.slice(1) };
    expect(parseFollowUpRouting(broken)).toBeNull();
  });

  it('rejects a pattern whose two picks are the same practice', () => {
    const patterns = routingFile.patterns.map((p: { picks: unknown[] }, i: number) =>
      i === 0 ? { ...p, picks: [p.picks[0], p.picks[0]] } : p,
    );
    expect(parseFollowUpRouting({ ...routingFile, patterns })).toBeNull();
  });

  it('rejects an unknown pattern id or content kind', () => {
    const patterns = routingFile.patterns.map((p: object, i: number) =>
      i === 0 ? { ...p, id: 'stretch' } : p,
    );
    expect(parseFollowUpRouting({ ...routingFile, patterns })).toBeNull();
    const kinds = routingFile.patterns.map((p: { picks: object[] }, i: number) =>
      i === 0 ? { ...p, picks: [{ ...p.picks[0], kind: 'article' }, p.picks[1]] } : p,
    );
    expect(parseFollowUpRouting({ ...routingFile, patterns: kinds })).toBeNull();
  });

  it('rejects non-objects', () => {
    expect(parseFollowUpRouting(null)).toBeNull();
    expect(parseFollowUpRouting('x')).toBeNull();
    expect(parseFollowUpRouting({})).toBeNull();
  });
});

describe('protection-pattern seed (content/protection-patterns-v1.json)', () => {
  it('covers every live Somatic Card and PowerDrop, using only valid patterns', () => {
    expect(Object.keys(seedFile.somaticCards).sort()).toEqual([...cardSlugs].sort());
    expect(Object.keys(seedFile.powerDrops).sort()).toEqual([...dropSlugs].sort());
    for (const entry of [
      ...Object.values(seedFile.somaticCards),
      ...Object.values(seedFile.powerDrops),
    ]) {
      expect(entry.patterns.length).toBeLessThanOrEqual(4);
      expect(new Set(entry.patterns).size).toBe(entry.patterns.length);
      for (const p of entry.patterns) expect(isProtectionPatternId(p)).toBe(true);
    }
  });
});
