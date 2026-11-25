/**
 * Safety checks for scripts that WRITE to the live Sanity dataset. Pure functions, so they are tested
 * without touching Sanity. Sanity has a single dataset (`production`), so there is no safe place to
 * point a script at: the protection has to be an explicit, typed decision and a way back.
 */

export const DEFAULT_MAX_CHANGES = 10;

/**
 * Whether a write run may start. A dry run is always fine. A real run needs `--allow-production` AND
 * the dataset name typed back exactly (`--confirm-dataset <name>`, or typed at the prompt), so it can
 * never happen by accident or by re-running an old command.
 */
export function checkWriteGuard(input: {
  execute: boolean;
  allowProduction: boolean;
  confirmedDataset: string | null;
  dataset: string;
}): string[] {
  if (!input.execute) return [];
  const errors: string[] = [];
  if (!input.allowProduction) {
    errors.push(
      `Refusing to write to the live "${input.dataset}" dataset without --allow-production.`,
    );
  }
  if (input.confirmedDataset !== input.dataset) {
    errors.push(
      `The dataset name was not confirmed. Type "${input.dataset}" at the prompt, or pass --confirm-dataset ${input.dataset}.`,
    );
  }
  return errors;
}

/** `--max-changes`: how many documents one run may create or change. Default is deliberately small. */
export function parseMaxChanges(value: string | undefined): number {
  if (value === undefined) return DEFAULT_MAX_CHANGES;
  const n = value.trim() === '' ? NaN : Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`--max-changes must be a whole number, got "${value}".`);
  }
  return n;
}

/** An error when a run would touch more documents than allowed, so a wrong manifest cannot rewrite everything. */
export function checkChangeLimit(changedDocs: number, max: number): string | null {
  return changedDocs > max
    ? `This run would change ${changedDocs} documents, more than the limit of ${max}. Review the plan, then re-run with --max-changes ${changedDocs} if it is right.`
    : null;
}

/**
 * Checks a full dataset export (one JSON document per line) before anything is written. It must be
 * complete enough to restore from: every line valid, every document the run will touch present, and
 * the total within 1% of the live count. Returns the problems; an empty list means it is usable.
 */
export function verifyExport(
  lines: readonly string[],
  expected: { requiredIds: readonly string[]; liveCount: number },
): string[] {
  const errors: string[] = [];
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return ['The export is empty.'];

  const ids = new Set<string>();
  let invalid = 0;
  for (const line of nonEmpty) {
    try {
      const doc = JSON.parse(line) as { _id?: unknown };
      if (typeof doc._id === 'string') ids.add(doc._id);
      else invalid++;
    } catch {
      invalid++;
    }
  }
  if (invalid > 0) errors.push(`${invalid} line(s) of the export are not valid documents.`);

  const missing = expected.requiredIds.filter((id) => !ids.has(id));
  if (missing.length > 0) {
    errors.push(
      `${missing.length} document(s) this run will touch are missing from the export (for example ${missing[0]}).`,
    );
  }
  if (expected.liveCount > 0 && nonEmpty.length < expected.liveCount * 0.99) {
    errors.push(
      `The export has ${nonEmpty.length} documents but the dataset has ${expected.liveCount}.`,
    );
  }
  return errors;
}

/** A timestamped, filesystem-safe name for a backup file, e.g. `sanity-export-production-2026-11-25T16-40-12Z.ndjson`. */
export function backupFileName(
  kind: string,
  dataset: string,
  extension: string,
  now: Date,
): string {
  const stamp = now
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/:/g, '-');
  return `${kind}-${dataset}-${stamp}.${extension}`;
}
