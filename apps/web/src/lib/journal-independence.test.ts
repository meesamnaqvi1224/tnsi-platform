import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { JOURNAL_THEORY_CONDITIONS } from '@tnsi/db/schema';
import {
  categoryForCapacityScore,
  categoryForCapacityState,
  CAPACITY_STATES,
  RECOMMENDED_PRACTICE_CATEGORIES,
} from '@tnsi/core';

/**
 * My Reflections is independent of check-ins, recommendations, practice completion, progress and Human
 * Expansion Theory status. These tests pin that down structurally, so it cannot erode by accident.
 */
const SRC = fileURLToPath(new URL('..', import.meta.url)); // apps/web/src
const rel = (path: string) => relative(SRC, path).split(sep).join('/');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}
const files = sourceFiles(SRC);

describe('the journal is read and written by one module only', () => {
  it('no application file other than lib/journal.ts touches the journal table', () => {
    const offenders = files
      .filter((file) => /\bjournalEntries\b|\bjournal_entries\b/.test(readFileSync(file, 'utf8')))
      .map(rel);
    expect(offenders).toEqual(['lib/journal.ts']);
  });

  it('only the journal routes, the account-deletion flow and the user-sync path import the journal module', () => {
    const importers = files
      .filter((file) =>
        /from ['"](@\/lib\/journal|\.\/journal|\.\.\/journal)['"]/.test(readFileSync(file, 'utf8')),
      )
      .map(rel)
      .sort();
    expect(importers).toEqual(
      [
        'app/api/v1/journal/entries/[id]/route.ts',
        'app/api/v1/journal/entries/route.ts',
        'lib/account-deletion.ts',
        'lib/user-sync-ops.ts',
      ].sort(),
    );
  });

  it('check-ins, recommendations, practices, completion, journey and membership code never import it', () => {
    const guarded = files.filter((file) =>
      /^(lib\/(check-ins|practices|practice-[a-z-]+|journey[a-z-]*|membership[a-z-]*|recommend[a-z-]*|billing|crm-[a-z-]+)\.ts|app\/api\/v1\/(check-ins|today|practices|journey|billing|me\/entitlements)\/)/.test(
        rel(file),
      ),
    );
    expect(guarded.length).toBeGreaterThan(5); // the pattern really matched code
    // imports and identifiers, not prose: some existing comments say "journal entry" in the everyday sense
    const reachesJournal =
      /from\s+['"][^'"]*\/(journal|journal-access|journal-preview)['"]|\bjournalEntries\b|\bjournal_entries\b|api\/v1\/journal/;
    for (const file of guarded) {
      expect(readFileSync(file, 'utf8'), rel(file)).not.toMatch(reachesJournal);
    }
  });
});

describe('theory_condition is the five Human Expansion Theory conditions, exactly', () => {
  it('is exactly Safety, Capacity, Availability, Expansion, Participation', () => {
    expect([...JOURNAL_THEORY_CONDITIONS]).toEqual([
      'Safety',
      'Capacity',
      'Availability',
      'Expansion',
      'Participation',
    ]);
  });

  it("matches the app's own list of conditions (CONDITION_NAMES), so the two cannot drift apart", () => {
    const mobile = readFileSync(
      fileURLToPath(
        new URL('../../../mobile/src/content/human-expansion-theory.ts', import.meta.url),
      ),
      'utf8',
    );
    const block = /CONDITION_NAMES\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(mobile)?.[1] ?? '';
    const names = [...block.matchAll(/'([^']+)'/g)].map((match) => match[1]);
    expect(names).toEqual([...JOURNAL_THEORY_CONDITIONS]);
  });

  it('is a different taxonomy from the recommendation states and categories: no identifier is shared', () => {
    // One WORD appears in both frameworks - the HET condition "Expansion" and the recommendation
    // category "EXPANSION" - but they are different identifiers (the column's CHECK is case-sensitive,
    // and the integration tests prove `EXPANSION` is rejected there). Compared exactly, nothing overlaps.
    const recommendation = new Set<string>([
      ...CAPACITY_STATES,
      ...RECOMMENDED_PRACTICE_CATEGORIES,
    ]);
    for (const condition of JOURNAL_THEORY_CONDITIONS) {
      expect(recommendation.has(condition)).toBe(false);
    }
    expect(recommendation.has('EXPANSION')).toBe(true); // the category exists...
    expect([...JOURNAL_THEORY_CONDITIONS]).not.toContain('EXPANSION'); // ...and is not a theory condition
  });
});

describe('the recommendation mapping is unchanged', () => {
  it('LOW → GROUNDING, LOW_MODERATE → REGULATION, MODERATE → CENTERING, MODERATE_HIGH → EMBODIMENT, HIGH → EXPANSION', () => {
    expect(categoryForCapacityState('LOW')).toBe('GROUNDING');
    expect(categoryForCapacityState('LOW_MODERATE')).toBe('REGULATION');
    expect(categoryForCapacityState('MODERATE')).toBe('CENTERING');
    expect(categoryForCapacityState('MODERATE_HIGH')).toBe('EMBODIMENT');
    expect(categoryForCapacityState('HIGH')).toBe('EXPANSION');
    expect([1, 2, 3, 4, 5].map(categoryForCapacityScore)).toEqual([
      'GROUNDING',
      'REGULATION',
      'CENTERING',
      'EMBODIMENT',
      'EXPANSION',
    ]);
  });
});
