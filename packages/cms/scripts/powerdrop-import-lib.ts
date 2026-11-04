/**
 * Pure logic for the PowerDrops™ importer (`import-powerdrops.ts`): manifest
 * validation against the existing `powerDrop` Sanity schema
 * (`src/schema/documents/powerDrop.ts`), stable document-id derivation, and an
 * import runner whose I/O is injected so its behaviour (above all, that a dry
 * run never writes) can be unit-tested without a network.
 *
 * It never invents or repairs content — it only reports problems. It adds no
 * schema field: `sourceTags` in the manifest is transcribed source material
 * the schema has no field for, and is deliberately NOT written to Sanity.
 */

/** Must equal the category list in the Sanity schema (a test asserts it). */
export const POWER_DROP_CATEGORIES = [
  'Regulation',
  'Transition',
  'Softening',
  'Authenticity',
  'Mental Unload',
  'Grounding',
  'Interoception',
  'Self-Worth',
  'Release',
] as const;

export type PowerDropStatus = 'published' | 'draft';

export interface PowerDropManifestEntry {
  slug: string;
  title: string;
  category: string;
  /** The card's one-line summary (schema field `description`). */
  description: string;
  /** The card's own "Purpose" label (schema field `focus`). */
  focus: string;
  /** Only when the card itself states one; otherwise omitted. */
  duration?: string | null;
  /** The card's "How to" steps, in order. */
  instructions: string[];
  anchorStatement: string;
  /** Transcribed card keywords. Not a schema field; never imported. */
  sourceTags?: string[];
  sortOrder: number;
  featured: boolean;
  /** Regulation Suite™ free selection. The approved model offers exactly three. */
  freeAccess: boolean;
  status: PowerDropStatus;
  /**
   * File name of the card artwork inside the artwork directory. `null` until
   * the owner supplies the file — a name is never guessed. Becomes the
   * schema's existing `cardImage` (no schema change).
   */
  artworkSource?: string | null;
  /** Alt text for the artwork; required whenever `artworkSource` is set. */
  artworkAlt?: string | null;
}

export interface PowerDropManifest {
  version: number;
  source: string;
  excluded: { title: string; reason: string }[];
  freeSelection: { status: string; note: string; selected: string[] };
  artwork: { status: string; note: string; uiFrame?: string };
  powerDrops: PowerDropManifestEntry[];
}

/** The approved model offers exactly three free PowerDrops™ (see `MEMBERSHIP_FREE_POWERDROPS`). */
export const APPROVED_FREE_POWERDROPS = 3;

/** Sanity-style slug: lowercase, runs of non-alphanumerics become one hyphen. */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Deterministic id, same `powerDrop.<slug>` convention the existing documents use. */
export function powerDropDocId(slug: string): string {
  return `powerDrop.${slug}`;
}

export interface ValidateOptions {
  /**
   * Once the membership content is being prepared the free selection must be
   * complete: exactly three. Without it, zero (not chosen yet) or three.
   */
  requireFreeSelection?: boolean;
}

export function validatePowerDropManifest(
  m: PowerDropManifest,
  options: ValidateOptions = {},
): string[] {
  const errors: string[] = [];
  const slugs = new Set<string>();
  const titles = new Set<string>();
  const sortOrders = new Set<number>();
  const artworkFiles = new Set<string>();

  for (const d of m.powerDrops) {
    const label = d.title?.trim() || d.slug || '(untitled)';
    if (!d.title?.trim()) errors.push(`${label}: missing title`);
    if (!d.slug?.trim()) errors.push(`${label}: missing slug`);
    else if (d.title?.trim() && d.slug !== slugifyTitle(d.title)) {
      errors.push(`${label}: slug "${d.slug}" does not match the title's slug`);
    }
    if (!d.description?.trim()) errors.push(`${label}: missing description`);
    if (!d.focus?.trim()) errors.push(`${label}: missing focus`);
    if (!d.anchorStatement?.trim()) errors.push(`${label}: missing anchorStatement`);
    if (!(POWER_DROP_CATEGORIES as readonly string[]).includes(d.category)) {
      errors.push(`${label}: category "${d.category}" is not in the schema's category list`);
    }
    if (!Array.isArray(d.instructions) || d.instructions.length === 0) {
      errors.push(`${label}: no instructions`);
    } else if (d.instructions.some((step) => !step?.trim())) {
      errors.push(`${label}: an instruction step is empty`);
    }
    if (d.status !== 'published' && d.status !== 'draft') {
      errors.push(`${label}: status must be "published" or "draft"`);
    }
    if (typeof d.sortOrder !== 'number') errors.push(`${label}: sortOrder must be a number`);

    // Artwork: never published without it, never without alt text, never a path.
    const source = d.artworkSource?.trim() || null;
    if (d.status === 'published' && !source) {
      errors.push(`${label}: cannot be published without its card artwork (artworkSource)`);
    }
    if (source) {
      if (/[\\/]/.test(source) || source.startsWith('.')) {
        errors.push(`${label}: artworkSource must be a plain file name, got "${source}"`);
      }
      if (!d.artworkAlt?.trim())
        errors.push(`${label}: artworkSource is set but artworkAlt is empty`);
      if (artworkFiles.has(source)) errors.push(`duplicate artworkSource ${source}`);
      artworkFiles.add(source);
    }

    if (slugs.has(d.slug)) errors.push(`duplicate slug ${d.slug}`);
    slugs.add(d.slug);
    if (titles.has(d.title)) errors.push(`duplicate title ${d.title}`);
    titles.add(d.title);
    if (sortOrders.has(d.sortOrder)) errors.push(`duplicate sortOrder ${d.sortOrder}`);
    sortOrders.add(d.sortOrder);
  }

  const free = m.powerDrops.filter((d) => d.freeAccess);
  const allowed = options.requireFreeSelection
    ? free.length === APPROVED_FREE_POWERDROPS
    : free.length === 0 || free.length === APPROVED_FREE_POWERDROPS;
  if (!allowed) {
    errors.push(
      `freeAccess is set on ${free.length} PowerDrops; the approved model offers exactly ${APPROVED_FREE_POWERDROPS}${options.requireFreeSelection ? '' : ' (or none yet)'}`,
    );
  }

  // The recorded selection must be the same set the flags express.
  const selected = m.freeSelection.selected;
  for (const slug of selected) {
    if (!slugs.has(slug)) errors.push(`selected free PowerDrop "${slug}" is not in the manifest`);
  }
  const flagged = free.map((d) => d.slug).sort();
  if (selected.length > 0 && JSON.stringify([...selected].sort()) !== JSON.stringify(flagged)) {
    errors.push('freeSelection.selected does not match the PowerDrops flagged freeAccess');
  }
  return errors;
}

/**
 * The Sanity document for one entry. Only fields that exist on the schema;
 * `duration` is omitted unless the card states one. `cardImage` is set only
 * when an uploaded asset id is supplied (artwork is provided separately).
 */
export function buildPowerDropDocument(
  d: PowerDropManifestEntry,
  artworkAssetId?: string,
): Record<string, unknown> {
  return {
    _id: powerDropDocId(d.slug),
    _type: 'powerDrop',
    title: d.title,
    slug: { _type: 'slug', current: d.slug },
    category: d.category,
    description: d.description,
    focus: d.focus,
    ...(d.duration ? { duration: d.duration } : {}),
    instructions: d.instructions,
    anchorStatement: d.anchorStatement,
    featured: d.featured,
    freeAccess: d.freeAccess,
    sortOrder: d.sortOrder,
    status: d.status,
    ...(artworkAssetId ? { cardImage: buildCardImage(artworkAssetId, d.artworkAlt ?? '') } : {}),
  };
}

export function buildCardImage(assetId: string, alt: string) {
  return { _type: 'image', asset: { _type: 'reference', _ref: assetId }, alt };
}

// ---------------------------------------------------------------------------
// Import runner (I/O injected)
// ---------------------------------------------------------------------------

export interface ExistingPowerDrop {
  _id: string;
  title: string;
  status: string | null;
  hasCardImage: boolean;
}

export interface ImportIo {
  /** Read-only: every `powerDrop` currently in the dataset. */
  listExisting(): Promise<ExistingPowerDrop[]>;
  /** Read-only: does this file exist in the artwork directory? */
  artworkExists(fileName: string): boolean;
  /** WRITES: uploads one image asset, returns its asset id. Never called in a dry run. */
  uploadArtwork(fileName: string): Promise<string>;
  /** WRITES: applies Sanity mutations. Never called in a dry run. */
  mutate(mutations: unknown[]): Promise<void>;
  log(line: string): void;
}

export interface ImportResult {
  ok: boolean;
  /** True only if anything was sent to Sanity (mutations or uploads). */
  wrote: boolean;
  planned: number;
  created: number;
  existing: number;
  artworkAttached: number;
  errors: string[];
}

/**
 * Plans (always) and applies (only with `execute`) the import. A dry run
 * performs read-only calls and nothing else; the "[Placeholder]" documents
 * are only ever reported on, never mutated, in either mode.
 */
export async function runPowerDropImport(
  manifest: PowerDropManifest,
  io: ImportIo,
  options: { execute: boolean },
): Promise<ImportResult> {
  const result: ImportResult = {
    ok: false,
    wrote: false,
    planned: 0,
    created: 0,
    existing: 0,
    artworkAttached: 0,
    errors: [],
  };

  result.errors = validatePowerDropManifest(manifest, { requireFreeSelection: true });
  for (const d of manifest.powerDrops) {
    if (d.artworkSource && !io.artworkExists(d.artworkSource)) {
      result.errors.push(`${d.title}: artwork file "${d.artworkSource}" not found`);
    }
  }
  if (result.errors.length > 0) return result;

  const existing = await io.listExisting();
  const byId = new Map(existing.map((e) => [e._id, e]));

  const toCreate = manifest.powerDrops.filter((d) => !byId.has(powerDropDocId(d.slug)));
  const present = manifest.powerDrops.filter((d) => byId.has(powerDropDocId(d.slug)));
  // Existing drafts of ours that have no image yet but now have artwork supplied.
  const toAttach = present.filter(
    (d) => d.artworkSource && !byId.get(powerDropDocId(d.slug))!.hasCardImage,
  );

  result.planned = toCreate.length;
  result.existing = present.length;

  for (const d of toCreate) io.log(`  create  ${powerDropDocId(d.slug)}  [${d.status}]`);
  for (const d of present) io.log(`  exists  ${powerDropDocId(d.slug)}  (left untouched)`);
  for (const d of toAttach)
    io.log(`  artwork ${powerDropDocId(d.slug)}  (attach ${d.artworkSource})`);

  const placeholders = existing.filter((e) => e.title.startsWith('[Placeholder]'));
  if (placeholders.length > 0) {
    io.log(
      `  note    ${placeholders.length} "[Placeholder]" PowerDrop(s) exist and are NOT touched by this script`,
    );
  }

  if (!options.execute) {
    io.log('Dry run only — nothing was written.');
    result.ok = true;
    return result;
  }

  const mutations: unknown[] = [];
  for (const d of toCreate) {
    const assetId = d.artworkSource ? await io.uploadArtwork(d.artworkSource) : undefined;
    result.wrote = result.wrote || Boolean(assetId);
    if (assetId) result.artworkAttached += 1;
    mutations.push({ createIfNotExists: buildPowerDropDocument(d, assetId) });
  }
  for (const d of toAttach) {
    const assetId = await io.uploadArtwork(d.artworkSource!);
    result.wrote = true;
    result.artworkAttached += 1;
    mutations.push({
      patch: {
        id: powerDropDocId(d.slug),
        setIfMissing: { cardImage: buildCardImage(assetId, d.artworkAlt ?? '') },
      },
    });
  }
  if (mutations.length > 0) {
    await io.mutate(mutations);
    result.wrote = true;
  }
  result.created = toCreate.length;
  result.ok = true;
  return result;
}
