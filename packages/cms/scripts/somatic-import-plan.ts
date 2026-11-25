/**
 * Plans what the Somatic Core Series importer would write, WITHOUT writing anything. Pure, so every
 * safety rule is unit tested. The importer prints this plan first and only then (with the guard
 * satisfied) turns it into Sanity mutations.
 *
 * The rules, in short:
 *  - Nothing is ever replaced. A missing document is created (as a draft); an existing one is patched,
 *    field by field, only where the manifest differs.
 *  - On an existing document `status`, `hetConditions` and `protectionPatterns` are never touched.
 *  - An existing series is left completely alone.
 *  - Artwork: a card whose manifest `artworkSource` is `null` has no image by design (its image is
 *    removed if it has one); a named file that exists is uploaded and set; a named file that is
 *    missing leaves the card's image exactly as it is.
 */
import {
  cardDocId,
  seriesDocId,
  type Manifest,
  type ManifestCard,
  type ManifestSeries,
} from './somatic-import-lib';

/** Fields the importer must never change on a document that already exists. */
export const PROTECTED_FIELDS = ['status', 'hetConditions', 'protectionPatterns'] as const;

/** The only card fields a patch may set. Artwork is handled separately. */
export const CARD_OWNED_FIELDS = [
  'cardNumber',
  'title',
  'slug',
  'series',
  'sortOrder',
  'practiceSteps',
  'whatToNotice',
  'invitation',
  'purpose',
  'description',
  'orientation',
  'gentleNote',
  'anchor',
] as const;

export type ExistingDoc = Record<string, unknown> & { _id: string; _rev: string; _type: string };

export type ArtworkAction = 'upload' | 'remove';

export type PlanItem =
  | {
      kind: 'create';
      id: string;
      type: 'somaticSeries' | 'somaticCard';
      label: string;
      doc: Record<string, unknown>;
      artwork?: 'upload';
    }
  | {
      kind: 'patch';
      id: string;
      rev: string;
      label: string;
      set: Record<string, unknown>;
      unset: string[];
      changedFields: string[];
      artwork?: ArtworkAction;
    }
  | { kind: 'skip'; id: string; label: string; reason: string };

export interface Plan {
  items: PlanItem[];
  /** Documents that would be created or changed. */
  changedDocs: number;
  /** Anything that breaks a safety rule. A plan with violations is never executed. */
  violations: string[];
  warnings: string[];
}

export interface PlanOptions {
  /** Whether the artwork file a card names is present on this machine. */
  artworkFileExists: (card: ManifestCard) => boolean;
}

const slugOf = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Order-independent, key-independent form, so a Studio edit that only changed a `_key` is not a difference. */
function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      if (key === '_key') continue;
      out[key] = normalize((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}
const same = (a: unknown, b: unknown) =>
  JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));

function seriesDoc(manifest: Manifest, s: ManifestSeries): Record<string, unknown> {
  return {
    _id: seriesDocId(s.seriesNumber),
    _type: 'somaticSeries',
    seriesNumber: s.seriesNumber,
    title: s.title,
    slug: { _type: 'slug', current: slugOf(s.title) },
    collection: manifest.collection,
    coreQuestion: s.coreQuestion,
    status: 'draft',
    sortOrder: s.seriesNumber,
  };
}

/** The card fields the manifest owns, in the shape Sanity stores them. Empty optional fields are left out. */
export function desiredCardFields(c: ManifestCard): Record<string, unknown> {
  const f: Record<string, unknown> = {
    cardNumber: c.cardNumber,
    title: c.title,
    slug: { _type: 'slug', current: c.slug },
    series: { _type: 'reference', _ref: seriesDocId(c.seriesNumber) },
    sortOrder: c.sortOrder,
    practiceSteps: c.practiceSteps.map((s) => ({
      _type: 'practiceStep',
      _key: `step${s.order}`,
      order: s.order,
      ...(s.label ? { label: s.label } : {}),
      instruction: s.instruction,
    })),
    whatToNotice: c.whatToNotice.map((n) => ({
      _type: 'noticePrompt',
      _key: `notice${n.order}`,
      order: n.order,
      text: n.text,
    })),
  };
  if (c.invitation) f.invitation = c.invitation;
  if (c.purpose) f.purpose = c.purpose;
  if (c.description) f.description = c.description;
  if (c.orientation) f.orientation = c.orientation;
  if (c.gentleNote) f.gentleNote = c.gentleNote;
  if (c.anchor) f.anchor = c.anchor;
  return f;
}

export function buildPlan(
  manifest: Manifest,
  existing: ReadonlyMap<string, ExistingDoc>,
  options: PlanOptions,
): Plan {
  const items: PlanItem[] = [];
  const warnings: string[] = [];

  // Series first (cards reference them). An existing series is never touched.
  for (const s of manifest.series) {
    const id = seriesDocId(s.seriesNumber);
    const label = `Series ${s.seriesNumber} (${s.title})`;
    if (existing.has(id)) {
      items.push({ kind: 'skip', id, label, reason: 'exists, left alone' });
    } else {
      items.push({ kind: 'create', id, type: 'somaticSeries', label, doc: seriesDoc(manifest, s) });
    }
  }

  for (const c of manifest.cards) {
    const id = cardDocId(c.seriesNumber, c.cardNumber);
    const label = `Card ${c.cardNumber} - ${c.title}`;
    const desired = desiredCardFields(c);
    const doc = existing.get(id);
    const fileExists = c.artworkSource !== null && options.artworkFileExists(c);

    if (!doc) {
      items.push({
        kind: 'create',
        id,
        type: 'somaticCard',
        label,
        doc: { _id: id, _type: 'somaticCard', ...desired, status: 'draft' },
        ...(fileExists ? { artwork: 'upload' as const } : {}),
      });
      if (c.artworkSource !== null && !fileExists) {
        warnings.push(`${label}: new card created without an image (artwork file not found).`);
      }
      continue;
    }

    const set: Record<string, unknown> = {};
    const changedFields: string[] = [];
    for (const key of CARD_OWNED_FIELDS) {
      if (!(key in desired)) continue; // the manifest has no opinion: never clear an existing value
      if (!same(doc[key], desired[key])) {
        set[key] = desired[key];
        changedFields.push(key);
      }
    }

    let artwork: ArtworkAction | undefined;
    const unset: string[] = [];
    if (c.artworkSource === null) {
      if (doc.cardArtwork !== undefined && doc.cardArtwork !== null) {
        unset.push('cardArtwork');
        artwork = 'remove';
        changedFields.push('cardArtwork (removed: no image by design)');
      }
    } else if (fileExists) {
      artwork = 'upload';
      changedFields.push(
        doc.cardArtwork ? 'cardArtwork (REPLACED by the local file)' : 'cardArtwork (added)',
      );
    }
    // A named artwork file that is missing here leaves the existing image exactly as it is.

    if (changedFields.length === 0) {
      items.push({ kind: 'skip', id, label, reason: 'already up to date' });
    } else {
      items.push({ kind: 'patch', id, rev: doc._rev, label, set, unset, changedFields, artwork });
    }
  }

  const plan: Plan = { items, changedDocs: 0, violations: [], warnings };
  plan.changedDocs = items.filter((i) => i.kind !== 'skip').length;
  plan.violations = findViolations(items, existing);
  return plan;
}

/** Every safety rule, checked on the finished plan. A rule broken here is a bug in the planner. */
export function findViolations(
  items: readonly PlanItem[],
  existing: ReadonlyMap<string, ExistingDoc>,
): string[] {
  const out: string[] = [];
  const allowedSet = new Set<string>([...CARD_OWNED_FIELDS]);
  for (const item of items) {
    if (item.kind === 'create') {
      if (existing.has(item.id))
        out.push(`${item.id}: would be created although it already exists.`);
      if (item.doc.status !== 'draft')
        out.push(`${item.id}: a new document must be created as a draft.`);
      for (const f of PROTECTED_FIELDS) {
        if (f !== 'status' && f in item.doc)
          out.push(`${item.id}: a new document must not set ${f}.`);
      }
    }
    if (item.kind === 'patch') {
      if (!existing.has(item.id)) out.push(`${item.id}: patched although it does not exist.`);
      if (item.id.startsWith('somaticSeries.'))
        out.push(`${item.id}: an existing series must be left alone.`);
      for (const key of Object.keys(item.set)) {
        if ((PROTECTED_FIELDS as readonly string[]).includes(key))
          out.push(`${item.id}: would set protected field ${key}.`);
        else if (!allowedSet.has(key))
          out.push(`${item.id}: would set ${key}, which the importer does not own.`);
      }
      for (const key of item.unset) {
        if (key !== 'cardArtwork')
          out.push(`${item.id}: would unset ${key}; only cardArtwork may be removed.`);
      }
    }
  }
  return out;
}

/** The plan as plain lines, printed before anything is written. */
export function formatPlan(plan: Plan): string[] {
  const lines: string[] = [];
  for (const item of plan.items) {
    if (item.kind === 'skip') lines.push(`  skip    ${item.label}: ${item.reason}`);
    else if (item.kind === 'create') {
      lines.push(`  CREATE  ${item.label} (as a draft)${item.artwork ? ' + image' : ''}`);
    } else {
      lines.push(
        `  PATCH   ${item.label}: ${item.changedFields.join(', ')} (status and condition tags untouched)`,
      );
    }
  }
  for (const w of plan.warnings) lines.push(`  note    ${w}`);
  const creates = plan.items.filter((i) => i.kind === 'create').length;
  const patches = plan.items.filter((i) => i.kind === 'patch').length;
  lines.push(
    `  Total: ${creates} to create, ${patches} to change, ${plan.items.length - creates - patches} left as they are.`,
  );
  if (plan.violations.length > 0) {
    lines.push('  SAFETY VIOLATIONS (this plan will not run):');
    for (const v of plan.violations) lines.push(`    - ${v}`);
  }
  return lines;
}
