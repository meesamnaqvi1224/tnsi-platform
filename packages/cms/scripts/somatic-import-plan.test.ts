import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { cardDocId, seriesDocId, type Manifest, type ManifestCard } from './somatic-import-lib';
import {
  PROTECTED_FIELDS,
  buildPlan,
  desiredCardFields,
  findViolations,
  formatPlan,
  type ExistingDoc,
  type PlanItem,
} from './somatic-import-plan';

function card(n: number, extra: Partial<ManifestCard> = {}): ManifestCard {
  return {
    cardNumber: n,
    seriesNumber: 1,
    title: `Card ${n}`,
    slug: `card-${n}`,
    sortOrder: n,
    artworkSource: `card-${n}.jpeg`,
    invitation: `Invitation ${n}`,
    purpose: null,
    description: null,
    orientation: null,
    practiceSteps: [
      { order: 0, label: 'Arrive', instruction: 'Sit.' },
      { order: 1, instruction: 'Breathe.' },
    ],
    whatToNotice: [{ order: 0, text: 'Notice.' }],
    gentleNote: 'Be gentle.',
    anchor: 'I am here.',
    visualTreatment: null,
    heroImageSource: null,
    supportingImages: [],
    demonstrationSequence: [],
    sourceReference: 'test',
    needsReview: false,
    reviewNote: null,
    ...extra,
  };
}
const manifest = (cards: ManifestCard[], seriesNumbers = [1]): Manifest => ({
  collection: 'core-series',
  series: seriesNumbers.map((n) => ({ seriesNumber: n, title: `Series ${n}`, coreQuestion: 'Q?' })),
  cards,
  excludedSource: [],
});

/** A document as it is live: published, tagged, with an image, matching the manifest. */
function live(c: ManifestCard, overrides: Record<string, unknown> = {}): ExistingDoc {
  return {
    _id: cardDocId(c.seriesNumber, c.cardNumber),
    _type: 'somaticCard',
    _rev: `rev-${c.cardNumber}`,
    ...desiredCardFields(c),
    status: 'published',
    hetConditions: ['Safety', 'Capacity'],
    protectionPatterns: ['hypervigilance'],
    cardArtwork: { _type: 'image', asset: { _ref: 'image-abc' } },
    ...overrides,
  } as ExistingDoc;
}
const liveSeries = (n: number): ExistingDoc => ({
  _id: seriesDocId(n),
  _type: 'somaticSeries',
  _rev: `srev-${n}`,
  seriesNumber: n,
  status: 'published',
});
const existingMap = (...docs: ExistingDoc[]) => new Map(docs.map((d) => [d._id, d]));
const noFiles = { artworkFileExists: () => false };
const allFiles = { artworkFileExists: () => true };
const kinds = (items: PlanItem[]) => items.map((i) => i.kind);

describe('buildPlan: series', () => {
  it('leaves an existing series completely alone', () => {
    const plan = buildPlan(manifest([]), existingMap(liveSeries(1)), noFiles);
    expect(plan.items).toEqual([
      expect.objectContaining({ kind: 'skip', reason: 'exists, left alone' }),
    ]);
    expect(plan.changedDocs).toBe(0);
  });

  it('creates a missing series as a draft', () => {
    const plan = buildPlan(manifest([], [2]), existingMap(), noFiles);
    expect(plan.items[0]).toMatchObject({
      kind: 'create',
      type: 'somaticSeries',
      doc: { status: 'draft' },
    });
  });
});

describe('buildPlan: cards', () => {
  it('a card already up to date is skipped', () => {
    const c = card(1);
    const plan = buildPlan(manifest([c]), existingMap(liveSeries(1), live(c)), noFiles);
    expect(plan.items.find((i) => i.id === cardDocId(1, 1))).toMatchObject({
      kind: 'skip',
      reason: 'already up to date',
    });
    expect(plan.changedDocs).toBe(0);
  });

  it('a missing card is created as a draft, with no condition tags, and an image only if its file exists', () => {
    const c = card(1);
    const without = buildPlan(manifest([c]), existingMap(liveSeries(1)), noFiles);
    const created = without.items.find((i) => i.kind === 'create')!;
    expect(created).toMatchObject({ doc: { status: 'draft' } });
    expect('hetConditions' in (created as { doc: object }).doc).toBe(false);
    expect('protectionPatterns' in (created as { doc: object }).doc).toBe(false);
    expect(without.warnings.join(' ')).toContain('without an image');
    const withFile = buildPlan(manifest([c]), existingMap(liveSeries(1)), allFiles);
    expect(withFile.items.find((i) => i.kind === 'create')).toMatchObject({ artwork: 'upload' });
  });

  it('changed text patches ONLY the changed field and never touches status or condition tags', () => {
    const c = card(1);
    const doc = live(c, { anchor: 'An older anchor.' });
    const plan = buildPlan(manifest([c]), existingMap(liveSeries(1), doc), noFiles);
    const patch = plan.items.find((i) => i.kind === 'patch')!;
    expect(patch).toMatchObject({
      kind: 'patch',
      set: { anchor: 'I am here.' },
      unset: [],
      rev: 'rev-1',
    });
    expect(Object.keys((patch as { set: object }).set)).toEqual(['anchor']);
    expect(plan.violations).toEqual([]);
  });

  it('a difference in _key alone is not a change (Studio edits)', () => {
    const c = card(1);
    const steps = desiredCardFields(c).practiceSteps as { _key: string }[];
    const doc = live(c, {
      practiceSteps: steps.map((s) => ({ ...s, _key: `random-${Math.random()}` })),
    });
    const plan = buildPlan(manifest([c]), existingMap(liveSeries(1), doc), noFiles);
    expect(plan.changedDocs).toBe(0);
  });

  it('never clears an existing value the manifest has no opinion on', () => {
    const c = card(1, { description: null, purpose: null });
    const doc = live(c, { description: 'Written in Studio.', purpose: 'Edited in Studio.' });
    const plan = buildPlan(manifest([c]), existingMap(liveSeries(1), doc), noFiles);
    expect(plan.changedDocs).toBe(0);
  });
});

describe('buildPlan: artwork', () => {
  it('no image by design (null) removes an existing image and uploads nothing', () => {
    const c = card(1, { artworkSource: null });
    const plan = buildPlan(manifest([c]), existingMap(liveSeries(1), live(c)), allFiles);
    expect(plan.items.find((i) => i.kind === 'patch')).toMatchObject({
      unset: ['cardArtwork'],
      artwork: 'remove',
      set: {},
    });
  });

  it('no image by design changes nothing when the card already has none', () => {
    const c = card(1, { artworkSource: null });
    const doc = live(c);
    delete (doc as Record<string, unknown>).cardArtwork;
    const plan = buildPlan(manifest([c]), existingMap(liveSeries(1), doc), allFiles);
    expect(plan.changedDocs).toBe(0);
  });

  it('a named file that is missing leaves the existing image exactly as it is', () => {
    const c = card(1);
    const doc = live(c, { anchor: 'Older.' });
    const plan = buildPlan(manifest([c]), existingMap(liveSeries(1), doc), noFiles);
    const patch = plan.items.find((i) => i.kind === 'patch') as Extract<
      PlanItem,
      { kind: 'patch' }
    >;
    expect(patch.unset).toEqual([]);
    expect(patch.artwork).toBeUndefined();
  });

  it('a named file that exists is uploaded and flagged, including that it replaces an image', () => {
    const c = card(1);
    const plan = buildPlan(manifest([c]), existingMap(liveSeries(1), live(c)), allFiles);
    const patch = plan.items.find((i) => i.kind === 'patch') as Extract<
      PlanItem,
      { kind: 'patch' }
    >;
    expect(patch.artwork).toBe('upload');
    expect(patch.changedFields.join(' ')).toContain('REPLACED');
  });
});

describe('the safety rules hold for every kind of existing document', () => {
  it('no plan ever contains a replace, a protected field, a series patch or a create over an existing id', () => {
    const cases: [ManifestCard, Record<string, unknown>][] = [];
    for (let n = 1; n <= 12; n++) {
      cases.push([
        card(n, {
          artworkSource: n % 3 === 0 ? null : `c${n}.jpeg`,
          description: n % 2 ? 'New description' : null,
        }),
        n % 4 === 0
          ? { anchor: 'old' }
          : n % 5 === 0
            ? { title: 'Old title', hetConditions: ['Expansion'] }
            : {},
      ]);
    }
    for (const files of [noFiles, allFiles]) {
      const cards = cases.map(([c]) => c);
      const docs = cases.map(([c, o]) => live(c, o));
      const plan = buildPlan(manifest(cards), existingMap(liveSeries(1), ...docs), files);
      expect(plan.violations).toEqual([]);
      for (const item of plan.items) {
        expect(['create', 'patch', 'skip']).toContain(item.kind); // no replace exists in the plan language
        if (item.kind === 'patch') {
          for (const f of PROTECTED_FIELDS) {
            expect(f in item.set).toBe(false);
            expect(item.unset).not.toContain(f);
          }
          expect(item.id.startsWith('somaticSeries.')).toBe(false);
        }
        if (item.kind === 'create') expect(docs.some((d) => d._id === item.id)).toBe(false);
      }
    }
  });
});

describe('findViolations catches a bad plan', () => {
  const doc = live(card(1));
  const ex = existingMap(doc);
  const patch = (extra: Partial<Extract<PlanItem, { kind: 'patch' }>>): PlanItem => ({
    kind: 'patch',
    id: doc._id,
    rev: 'r',
    label: 'x',
    set: {},
    unset: [],
    changedFields: ['x'],
    ...extra,
  });

  it('flags setting status, condition tags or protection patterns', () => {
    for (const f of PROTECTED_FIELDS) {
      expect(findViolations([patch({ set: { [f]: 'x' } })], ex).join(' ')).toContain(f);
    }
  });
  it('flags unsetting anything except cardArtwork', () => {
    expect(findViolations([patch({ unset: ['hetConditions'] })], ex)).not.toEqual([]);
    expect(findViolations([patch({ unset: ['cardArtwork'] })], ex)).toEqual([]);
  });
  it('flags a field the importer does not own', () => {
    expect(findViolations([patch({ set: { somethingElse: 1 } })], ex)).not.toEqual([]);
  });
  it('flags patching a series, a missing document, and creating over an existing one', () => {
    expect(findViolations([patch({ id: seriesDocId(1) })], existingMap(liveSeries(1)))).not.toEqual(
      [],
    );
    expect(findViolations([patch({ id: 'somaticCard.nope' })], ex)).not.toEqual([]);
    expect(
      findViolations(
        [
          {
            kind: 'create',
            id: doc._id,
            type: 'somaticCard',
            label: 'x',
            doc: { _id: doc._id, status: 'draft' },
          },
        ],
        ex,
      ),
    ).not.toEqual([]);
  });
  it('flags a new document that is not a draft or that carries condition tags', () => {
    const bad = (d: Record<string, unknown>): PlanItem => ({
      kind: 'create',
      id: 'somaticCard.new',
      type: 'somaticCard',
      label: 'x',
      doc: d,
    });
    expect(findViolations([bad({ status: 'published' })], ex)).not.toEqual([]);
    expect(findViolations([bad({ status: 'draft', hetConditions: ['Safety'] })], ex)).not.toEqual(
      [],
    );
  });
});

describe('formatPlan', () => {
  it('prints what will happen, says tags and status are untouched, and totals it', () => {
    const c = card(1);
    const text = formatPlan(
      buildPlan(
        manifest([c, card(2)]),
        existingMap(liveSeries(1), live(c, { anchor: 'old' })),
        noFiles,
      ),
    ).join('\n');
    expect(text).toContain('skip    Series 1');
    expect(text).toContain('PATCH   Card 1');
    expect(text).toContain('status and condition tags untouched');
    expect(text).toContain('CREATE  Card 2');
    expect(text).toContain('Total: 1 to create, 1 to change');
  });

  it('shows violations when there are any', () => {
    const text = formatPlan({ items: [], changedDocs: 0, warnings: [], violations: ['nope'] }).join(
      '\n',
    );
    expect(text).toContain('SAFETY VIOLATIONS');
    expect(text).toContain('nope');
  });
});

describe('against the real manifest and a copy of how the cards are live today', () => {
  const real = JSON.parse(
    readFileSync(
      path.resolve(__dirname, '../../../content/somatic-cards/core-series-01-05.json'),
      'utf8',
    ),
  ) as Manifest;
  const NO_IMAGE = ['the-horizontal-eye-sweep', 'the-warmth-return'];
  const liveState = () => {
    const docs: ExistingDoc[] = real.series.map((s) => liveSeries(s.seriesNumber));
    for (const c of real.cards) {
      const d = live(c);
      if (NO_IMAGE.includes(c.slug)) delete (d as Record<string, unknown>).cardArtwork;
      docs.push(d);
    }
    return existingMap(...docs);
  };

  it('a full run today would change nothing and break no rule', () => {
    const plan = buildPlan(real, liveState(), noFiles);
    expect(plan.violations).toEqual([]);
    expect(plan.changedDocs).toBe(0);
    expect(plan.items).toHaveLength(real.series.length + real.cards.length);
    expect(kinds(plan.items).every((k) => k === 'skip')).toBe(true);
  });

  it('even with every artwork file present it never unpublishes or clears tags', () => {
    const plan = buildPlan(real, liveState(), allFiles);
    expect(plan.violations).toEqual([]);
    const touched = plan.items.filter((i) => i.kind === 'patch') as Extract<
      PlanItem,
      { kind: 'patch' }
    >[];
    for (const p of touched) for (const f of PROTECTED_FIELDS) expect(f in p.set).toBe(false);
    expect(plan.items.filter((i) => i.kind === 'create')).toHaveLength(0);
  });

  it('on an empty dataset it would only create drafts', () => {
    const plan = buildPlan(real, new Map(), noFiles);
    expect(plan.violations).toEqual([]);
    const creates = plan.items.filter((i) => i.kind === 'create') as Extract<
      PlanItem,
      { kind: 'create' }
    >[];
    expect(creates.length).toBe(real.series.length + real.cards.length);
    for (const c of creates) expect(c.doc.status).toBe('draft');
  });
});
