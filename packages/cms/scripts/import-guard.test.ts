import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAX_CHANGES,
  backupFileName,
  checkChangeLimit,
  checkWriteGuard,
  parseMaxChanges,
  verifyExport,
} from './import-guard';

describe('checkWriteGuard', () => {
  const base = {
    execute: true,
    allowProduction: true,
    confirmedDataset: 'production',
    dataset: 'production',
  };

  it('a dry run is always allowed, whatever else is missing', () => {
    expect(
      checkWriteGuard({ ...base, execute: false, allowProduction: false, confirmedDataset: null }),
    ).toEqual([]);
  });

  it('a real run is refused without --allow-production', () => {
    const errors = checkWriteGuard({ ...base, allowProduction: false });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('--allow-production');
  });

  it('a real run is refused until the dataset name is typed back exactly', () => {
    for (const typed of [null, '', 'prod', 'Production', 'production ', 'staging']) {
      const errors = checkWriteGuard({ ...base, confirmedDataset: typed });
      expect(errors.some((e) => e.includes('not confirmed'))).toBe(true);
    }
  });

  it('both missing gives both errors', () => {
    expect(
      checkWriteGuard({ ...base, allowProduction: false, confirmedDataset: null }),
    ).toHaveLength(2);
  });

  it('a real run with the flag and the exact name is allowed', () => {
    expect(checkWriteGuard(base)).toEqual([]);
  });
});

describe('change limit', () => {
  it('defaults to a small number and parses --max-changes', () => {
    expect(parseMaxChanges(undefined)).toBe(DEFAULT_MAX_CHANGES);
    expect(DEFAULT_MAX_CHANGES).toBeLessThanOrEqual(10);
    expect(parseMaxChanges('55')).toBe(55);
    expect(parseMaxChanges('0')).toBe(0);
  });

  it('rejects anything that is not a whole number', () => {
    for (const bad of ['', 'many', '-1', '2.5', 'NaN'])
      expect(() => parseMaxChanges(bad)).toThrow();
  });

  it('stops a run that would touch too many documents, and allows one within the limit', () => {
    expect(checkChangeLimit(10, 10)).toBeNull();
    expect(checkChangeLimit(0, 0)).toBeNull();
    expect(checkChangeLimit(55, 10)).toContain('55');
    expect(checkChangeLimit(1, 0)).not.toBeNull();
  });
});

describe('verifyExport', () => {
  const doc = (id: string) => JSON.stringify({ _id: id, _type: 'x' });
  const lines = ['a', 'b', 'c', 'd'].map(doc);

  it('accepts a complete export', () => {
    expect(verifyExport(lines, { requiredIds: ['a', 'c'], liveCount: 4 })).toEqual([]);
  });

  it('rejects an empty export', () => {
    expect(verifyExport([], { requiredIds: [], liveCount: 4 })).toEqual(['The export is empty.']);
    expect(verifyExport(['', '  '], { requiredIds: [], liveCount: 4 })).toEqual([
      'The export is empty.',
    ]);
  });

  it('rejects a damaged line (not JSON, or no _id)', () => {
    expect(verifyExport([...lines, '{not json'], { requiredIds: [], liveCount: 4 })[0]).toContain(
      'not valid',
    );
    expect(
      verifyExport([...lines, JSON.stringify({ _type: 'x' })], {
        requiredIds: [],
        liveCount: 4,
      })[0],
    ).toContain('not valid');
  });

  it('rejects an export that lacks a document the run will touch', () => {
    const errors = verifyExport(lines, { requiredIds: ['a', 'zzz'], liveCount: 4 });
    expect(errors.some((e) => e.includes('zzz'))).toBe(true);
  });

  it('rejects a truncated export, with a 1% tolerance', () => {
    const many = Array.from({ length: 200 }, (_, i) => doc(`d${i}`));
    expect(verifyExport(many.slice(0, 150), { requiredIds: [], liveCount: 200 }).length).toBe(1);
    expect(verifyExport(many.slice(0, 199), { requiredIds: [], liveCount: 200 })).toEqual([]);
  });
});

describe('backupFileName', () => {
  it('is timestamped and safe for a filename', () => {
    const name = backupFileName(
      'sanity-export',
      'production',
      'ndjson',
      new Date('2026-11-25T16:40:12.345Z'),
    );
    expect(name).toBe('sanity-export-production-2026-11-25T16-40-12Z.ndjson');
    expect(name).not.toMatch(/[:\s]/);
  });

  it('two runs a second apart never share a name', () => {
    const a = backupFileName('x', 'production', 'json', new Date('2026-11-25T16:40:12Z'));
    const b = backupFileName('x', 'production', 'json', new Date('2026-11-25T16:40:13Z'));
    expect(a).not.toBe(b);
  });
});
