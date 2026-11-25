import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The importer is a command-line script that talks to the live dataset, so it is not run in tests.
 * These tests read its source and pin the safety properties that must never regress: no replace, the
 * guard before any network call, and a verified backup before any write.
 */
const source = readFileSync(path.resolve(__dirname, 'import-somatic-core-series.ts'), 'utf8');
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
  .replace(/^\s*\/\/.*$/gm, ''); // line comments
const at = (needle: string | RegExp) =>
  typeof needle === 'string' ? code.indexOf(needle) : code.search(needle);

describe('the importer script', () => {
  it('never replaces a document', () => {
    expect(code).not.toContain('createOrReplace');
    expect(code).not.toMatch(/\breplace\s*:/);
    expect(code).toContain('createIfNotExists');
    expect(code).toContain('ifRevisionID');
  });

  it('is a dry run unless --execute is passed', () => {
    expect(code).toContain("const EXECUTE = args.includes('--execute')");
    expect(code).toContain('const DRY_RUN = !EXECUTE');
  });

  it('checks the guard before it reads the manifest or calls Sanity', () => {
    const guard = at('checkWriteGuard({');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(at('JSON.parse(readFileSync(manifestPath'));
    expect(guard).toBeLessThan(at('sanityQuery<ExistingDoc[]>'));
  });

  it('prints the plan and stops on a dry run before any backup or write', () => {
    const plan = at('formatPlan(plan)');
    const dryRunStop = at('if (DRY_RUN) {');
    expect(plan).toBeGreaterThan(-1);
    expect(plan).toBeLessThan(dryRunStop);
    expect(dryRunStop).toBeLessThan(at('exportDataset(exportFile)'));
  });

  it('applies the change limit and verifies a full export and a documents backup before any write', () => {
    const limit = at('checkChangeLimit(');
    const exportCall = at('exportDataset(exportFile)');
    const verify = at('verifyExport(');
    const docsBackup = at(/writeFileSync\(\s*docsFile/);
    const firstWrite = Math.min(
      at(/await uploadImageAsset\(\s*path\.join/),
      at('await sanityMutate(mutations)'),
    );
    expect(limit).toBeGreaterThan(-1);
    expect(limit).toBeLessThan(exportCall);
    expect(exportCall).toBeLessThan(verify);
    expect(verify).toBeLessThan(docsBackup);
    expect(docsBackup).toBeLessThan(firstWrite);
  });

  it('aborts, without writing, when the export fails verification', () => {
    const verify = at('verifyExport(');
    const abort = at('REFUSED: the export is not usable');
    const returnAfter = code.indexOf('return;', abort);
    expect(abort).toBeGreaterThan(verify);
    expect(returnAfter).toBeGreaterThan(abort);
    expect(returnAfter).toBeLessThan(at('await sanityMutate(mutations)'));
  });

  it('refuses a plan with safety violations', () => {
    const violation = at('plan.violations.length > 0');
    expect(violation).toBeGreaterThan(-1);
    expect(violation).toBeLessThan(at('if (DRY_RUN) {'));
  });

  it('keeps the project and dataset check', () => {
    expect(code).toContain("DATASET !== 'production' || PROJECT_ID !== 'hookrbdv'");
  });
});
