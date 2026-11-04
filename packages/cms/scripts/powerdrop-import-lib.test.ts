import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { powerDrop } from '../src/schema/documents/powerDrop';
import {
  APPROVED_FREE_POWERDROPS,
  POWER_DROP_CATEGORIES,
  buildPowerDropDocument,
  powerDropDocId,
  runPowerDropImport,
  slugifyTitle,
  validatePowerDropManifest,
  type ExistingPowerDrop,
  type ImportIo,
  type PowerDropManifest,
} from './powerdrop-import-lib';

const here = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(
  readFileSync(path.join(here, '../../../content/powerdrops/powerdrops-v1.json'), 'utf-8'),
) as PowerDropManifest;
const clone = (): PowerDropManifest => JSON.parse(JSON.stringify(manifest));

const FREE_SLUGS = [
  'the-90-second-exhale-drop',
  'micro-visualization-the-return',
  'the-powerdown-ritual',
];
const PAID_SLUGS = [
  'softness-reclaim-reset',
  'mask-drop-mirror-ritual',
  'invisible-labor-dump',
  'body-permission-practice',
  'the-enough-list',
  'microrebel-the-unsent-email',
];

const schemaField = (name: string) =>
  (powerDrop.fields as unknown as Array<Record<string, unknown>>).find((f) => f.name === name);

describe('the nine real PowerDrops™ manifest', () => {
  it('is valid, including the strict rule that the free selection is complete', () => {
    expect(validatePowerDropManifest(manifest)).toEqual([]);
    expect(validatePowerDropManifest(manifest, { requireFreeSelection: true })).toEqual([]);
  });

  it('holds exactly the nine approved PowerDrops, in card order, and not the bonus Journal Page', () => {
    expect(manifest.powerDrops.map((d) => d.title)).toEqual([
      'The 90-Second Exhale Drop',
      'The Powerdown Ritual',
      'Softness Reclaim Reset',
      'Mask Drop Mirror Ritual',
      'Invisible Labor Dump',
      'Micro Visualization: The Return',
      'Body Permission Practice',
      'The Enough List',
      'MicroRebel: The Unsent Email',
    ]);
    expect(manifest.powerDrops.map((d) => d.sortOrder)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(JSON.stringify(manifest.powerDrops).toLowerCase()).not.toContain('journal');
    expect(manifest.excluded.map((e) => e.title)).toEqual(['PowerDrop™ Journal Page']);
  });

  it('titles, slugs, sort orders and ids are all unique', () => {
    const { powerDrops } = manifest;
    expect(new Set(powerDrops.map((d) => d.title)).size).toBe(9);
    expect(new Set(powerDrops.map((d) => d.slug)).size).toBe(9);
    expect(new Set(powerDrops.map((d) => d.sortOrder)).size).toBe(9);
    expect(new Set(powerDrops.map((d) => powerDropDocId(d.slug))).size).toBe(9);
  });

  it('The Powerdown Ritual carries no ™ in its title', () => {
    const drop = manifest.powerDrops.find((d) => d.slug === 'the-powerdown-ritual')!;
    expect(drop.title).toBe('The Powerdown Ritual');
    expect(drop.title).not.toContain('™');
  });

  it('uses the approved category for each, one per category', () => {
    expect(manifest.powerDrops.map((d) => d.category)).toEqual([
      'Regulation',
      'Transition',
      'Softening',
      'Authenticity',
      'Mental Unload',
      'Grounding',
      'Interoception',
      'Self-Worth',
      'Release',
    ]);
    expect(new Set(manifest.powerDrops.map((d) => d.category)).size).toBe(9);
  });

  it('exactly three are free — The 90-Second Exhale Drop, Micro Visualization: The Return, The Powerdown Ritual', () => {
    const free = manifest.powerDrops.filter((d) => d.freeAccess);
    expect(free).toHaveLength(APPROVED_FREE_POWERDROPS);
    expect(free.map((d) => d.slug).sort()).toEqual([...FREE_SLUGS].sort());
    expect(free.map((d) => d.title).sort()).toEqual(
      [
        'Micro Visualization: The Return',
        'The 90-Second Exhale Drop',
        'The Powerdown Ritual',
      ].sort(),
    );
  });

  it('exactly six are paid', () => {
    const paid = manifest.powerDrops.filter((d) => !d.freeAccess);
    expect(paid).toHaveLength(6);
    expect(paid.map((d) => d.slug).sort()).toEqual([...PAID_SLUGS].sort());
  });

  it('the recorded selection is the owner-confirmed set and matches the flags', () => {
    expect(manifest.freeSelection.status).toBe('owner-confirmed');
    expect([...manifest.freeSelection.selected].sort()).toEqual([...FREE_SLUGS].sort());
  });

  it('every PowerDrop is still a draft and not featured', () => {
    for (const d of manifest.powerDrops) {
      expect(d.status).toBe('draft');
      expect(d.featured).toBe(false);
    }
  });

  it('every PowerDrop names its own artwork file, deterministically, with alt text', () => {
    const files = manifest.powerDrops.map((d) => d.artworkSource);
    expect(manifest.artwork.status).toBe('supplied');
    expect(new Set(files).size).toBe(9);
    expect(files).toEqual([
      'powerdrop-90-second-exhale.png',
      'powerdrop-powerdown-ritual.png',
      'powerdrop-softness-reclaim-reset.png',
      'powerdrop-mask-drop-mirror-ritual.png',
      'powerdrop-invisible-labor-dump.png',
      'powerdrop-micro-visualization-the-return.png',
      'powerdrop-body-permission-practice.png',
      'powerdrop-the-enough-list.png',
      'powerdrop-microrebel-the-unsent-email.png',
    ]);
    for (const d of manifest.powerDrops) {
      expect(d.artworkSource).toMatch(/^powerdrop-[a-z0-9-]+\.png$/);
      const alt = d.artworkAlt ?? '';
      expect(alt.trim().length, `${d.slug} alt`).toBeGreaterThan(20);
      expect(alt.length, `${d.slug} alt length`).toBeLessThanOrEqual(200);
      // Describes the picture, not the instruction: none of the practice steps or the
      // anchor statement is repeated in it.
      for (const step of [...d.instructions, d.anchorStatement]) {
        expect(alt.toLowerCase(), `${d.slug} alt repeats "${step}"`).not.toContain(
          step.toLowerCase(),
        );
      }
    }
    expect(new Set(manifest.powerDrops.map((d) => d.artworkAlt)).size).toBe(9);
  });
});

describe('agreement with the existing Sanity schema (no schema change needed)', () => {
  it('the importer category list is the schema category list', () => {
    const options = (schemaField('category')!.options as { list: { value: string }[] }).list;
    expect(options.map((o) => o.value)).toEqual([...POWER_DROP_CATEGORIES]);
  });

  it('the status values match the schema', () => {
    const options = (schemaField('status')!.options as { list: { value: string }[] }).list;
    expect(options.map((o) => o.value).sort()).toEqual(['draft', 'published']);
  });

  it('the image field the artwork lands in is the schema’s existing cardImage, with optional alt', () => {
    const cardImage = schemaField('cardImage')!;
    expect(cardImage.type).toBe('image');
    expect((cardImage.options as { hotspot: boolean }).hotspot).toBe(true);
    expect(cardImage.validation).toBeUndefined(); // not required
    const alt = (cardImage.fields as { name: string; validation?: unknown }[]).find(
      (f) => f.name === 'alt',
    );
    expect(alt).toBeDefined();
    expect(alt!.validation).toBeUndefined();
  });

  it('every built document uses only fields the schema defines, and no cardImage while no artwork exists', () => {
    const fieldNames = new Set(
      (powerDrop.fields as unknown as { name: string }[]).map((f) => f.name),
    );
    for (const entry of manifest.powerDrops) {
      const doc = buildPowerDropDocument(entry);
      for (const key of Object.keys(doc)) {
        if (key === '_id' || key === '_type') continue;
        expect(fieldNames.has(key), `${entry.slug}: "${key}" is not a schema field`).toBe(true);
      }
      expect(doc).not.toHaveProperty('cardImage');
      expect(doc).not.toHaveProperty('sourceTags');
      expect(doc).not.toHaveProperty('artworkSource');
    }
  });

  it('with an uploaded asset the document gets a schema-shaped cardImage, still no new field', () => {
    const entry = { ...manifest.powerDrops[0]!, artworkSource: 'x.jpg', artworkAlt: 'Card' };
    const doc = buildPowerDropDocument(entry, 'image-abc');
    expect(doc.cardImage).toEqual({
      _type: 'image',
      asset: { _type: 'reference', _ref: 'image-abc' },
      alt: 'Card',
    });
  });

  it('every schema-required field is present on every built document', () => {
    const required = ['title', 'slug', 'description', 'focus', 'anchorStatement'];
    for (const entry of manifest.powerDrops) {
      const doc = buildPowerDropDocument(entry);
      for (const key of required) expect(doc[key], `${entry.slug}.${key}`).toBeTruthy();
    }
  });

  it('builds the same id convention the existing documents use, deterministically', () => {
    expect(powerDropDocId('the-enough-list')).toBe('powerDrop.the-enough-list');
    expect(buildPowerDropDocument(manifest.powerDrops[0]!)).toEqual(
      buildPowerDropDocument(manifest.powerDrops[0]!),
    );
  });

  it('writes freeAccess exactly as the manifest says', () => {
    const docs = manifest.powerDrops.map((d) => buildPowerDropDocument(d));
    expect(docs.filter((d) => d.freeAccess === true)).toHaveLength(3);
    expect(docs.filter((d) => d.freeAccess === false)).toHaveLength(6);
  });
});

describe('slugifyTitle', () => {
  it('matches the slugs in the manifest for punctuation and numbers', () => {
    expect(slugifyTitle('Micro Visualization: The Return')).toBe('micro-visualization-the-return');
    expect(slugifyTitle('The 90-Second Exhale Drop')).toBe('the-90-second-exhale-drop');
    expect(slugifyTitle('MicroRebel: The Unsent Email')).toBe('microrebel-the-unsent-email');
  });
});

describe('validatePowerDropManifest', () => {
  it('rejects a category outside the schema list', () => {
    const m = clone();
    m.powerDrops[0]!.category = 'Calm';
    expect(validatePowerDropManifest(m).join('\n')).toContain('not in the schema');
  });

  it('rejects missing required content rather than inventing it', () => {
    const m = clone();
    m.powerDrops[1]!.anchorStatement = '';
    m.powerDrops[2]!.instructions = [];
    const errors = validatePowerDropManifest(m).join('\n');
    expect(errors).toContain('missing anchorStatement');
    expect(errors).toContain('no instructions');
  });

  it('never more than three free, and never two', () => {
    for (const count of [1, 2, 4, 9]) {
      const m = clone();
      m.powerDrops.forEach((d, i) => (d.freeAccess = i < count));
      m.freeSelection.selected = [];
      expect(validatePowerDropManifest(m).join('\n'), `${count} free`).toContain('exactly 3');
    }
  });

  it('zero free is tolerated only before the selection is being prepared; the strict check demands exactly three', () => {
    const none = clone();
    none.powerDrops.forEach((d) => (d.freeAccess = false));
    none.freeSelection.selected = [];
    expect(validatePowerDropManifest(none)).toEqual([]);
    expect(validatePowerDropManifest(none, { requireFreeSelection: true }).join('\n')).toContain(
      'exactly 3',
    );
  });

  it('rejects a recorded selection that disagrees with the flags', () => {
    const m = clone();
    m.freeSelection.selected = [FREE_SLUGS[0]!, FREE_SLUGS[1]!, PAID_SLUGS[0]!];
    expect(validatePowerDropManifest(m).join('\n')).toContain('does not match');
  });

  it('rejects duplicates and a slug that does not follow the title', () => {
    const m = clone();
    m.powerDrops[1]!.slug = m.powerDrops[0]!.slug;
    m.powerDrops[2]!.sortOrder = 1;
    const errors = validatePowerDropManifest(m).join('\n');
    expect(errors).toContain('duplicate slug');
    expect(errors).toContain('duplicate sortOrder');
    expect(errors).toContain('does not match the title');
  });

  it('will not allow a PowerDrop to be published without its artwork', () => {
    const m = clone();
    m.powerDrops[0]!.status = 'published';
    expect(validatePowerDropManifest(m)).toEqual([]); // artwork is named, so it may be published
    m.powerDrops[0]!.artworkSource = null;
    m.powerDrops[0]!.artworkAlt = null;
    expect(validatePowerDropManifest(m).join('\n')).toContain('without its card artwork');
  });

  it('requires alt text with artwork, and a plain file name', () => {
    const m = clone();
    m.powerDrops[0]!.artworkAlt = '';
    expect(validatePowerDropManifest(m).join('\n')).toContain('artworkAlt is empty');
    m.powerDrops[0]!.artworkAlt = 'The card';
    m.powerDrops[0]!.artworkSource = '../exhale.png';
    expect(validatePowerDropManifest(m).join('\n')).toContain('plain file name');
    m.powerDrops[0]!.artworkSource = m.powerDrops[1]!.artworkSource;
    expect(validatePowerDropManifest(m).join('\n')).toContain('duplicate artworkSource');
  });
});

// --- the import runner, with a fake Sanity -------------------------------

const PLACEHOLDERS: ExistingPowerDrop[] = ['grounding', 'mental-unload', 'regulation'].map((s) => ({
  _id: `powerDrop.placeholder-${s}`,
  title: `[Placeholder] ${s} PowerDrop`,
  status: 'published',
  hasCardImage: false,
}));

const ALL_FILES = manifest.powerDrops.map((d) => d.artworkSource!);

function fakeIo(existing: ExistingPowerDrop[], files: string[] = ALL_FILES) {
  const io = {
    listExisting: vi.fn(async () => existing),
    artworkExists: vi.fn((name: string) => files.includes(name)),
    uploadArtwork: vi.fn(async (name: string) => `image-${name}`),
    mutate: vi.fn<(mutations: unknown[]) => Promise<void>>(async () => undefined),
    log: vi.fn(),
  } satisfies ImportIo;
  return io;
}

describe('runPowerDropImport — dry run', () => {
  it('plans exactly nine records and writes nothing: no mutation, no upload', async () => {
    const io = fakeIo(PLACEHOLDERS);
    const result = await runPowerDropImport(manifest, io, { execute: false });
    expect(result.ok).toBe(true);
    expect(result.planned).toBe(9);
    expect(result.wrote).toBe(false);
    expect(io.mutate).not.toHaveBeenCalled();
    expect(io.uploadArtwork).not.toHaveBeenCalled();
  });

  it('only reads: listing existing documents is its single Sanity call', async () => {
    const io = fakeIo(PLACEHOLDERS);
    await runPowerDropImport(manifest, io, { execute: false });
    expect(io.listExisting).toHaveBeenCalledTimes(1);
  });

  it('reports the placeholders without touching them', async () => {
    const io = fakeIo(PLACEHOLDERS);
    await runPowerDropImport(manifest, io, { execute: false });
    const logged = io.log.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('3 "[Placeholder]" PowerDrop(s)');
    expect(logged).not.toContain('create  powerDrop.placeholder');
  });

  it('is refused (and still writes nothing) when the manifest is invalid', async () => {
    const m = clone();
    m.powerDrops[0]!.freeAccess = false; // only two free now
    m.freeSelection.selected = [];
    const io = fakeIo(PLACEHOLDERS);
    const result = await runPowerDropImport(m, io, { execute: false });
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('exactly 3');
    expect(io.listExisting).not.toHaveBeenCalled();
    expect(io.mutate).not.toHaveBeenCalled();
  });

  it('resolves all nine artwork files before planning anything', async () => {
    const io = fakeIo(PLACEHOLDERS);
    await runPowerDropImport(manifest, io, { execute: false });
    expect(io.artworkExists).toHaveBeenCalledTimes(9);
    for (const file of ALL_FILES) expect(io.artworkExists).toHaveBeenCalledWith(file);
  });

  it('is refused (and writes nothing) when a named artwork file is missing', async () => {
    const io = fakeIo(PLACEHOLDERS, ALL_FILES.slice(1));
    const result = await runPowerDropImport(manifest, io, { execute: false });
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('not found');
    expect(io.listExisting).not.toHaveBeenCalled();
    expect(io.mutate).not.toHaveBeenCalled();
  });
});

describe('runPowerDropImport — execute (against a fake, never the real dataset)', () => {
  it('uploads the nine artwork files and creates the nine as drafts via createIfNotExists, three free, nothing else', async () => {
    const io = fakeIo(PLACEHOLDERS);
    const result = await runPowerDropImport(manifest, io, { execute: true });
    expect(result.created).toBe(9);
    expect(result.artworkAttached).toBe(9);
    expect(io.uploadArtwork).toHaveBeenCalledTimes(9);
    expect(io.mutate).toHaveBeenCalledTimes(1);

    const mutations = io.mutate.mock.calls[0]![0] as {
      createIfNotExists: Record<string, unknown>;
    }[];
    expect(mutations).toHaveLength(9);
    for (const m of mutations) {
      expect(Object.keys(m)).toEqual(['createIfNotExists']); // never delete/patch/replace
      expect(m.createIfNotExists.status).toBe('draft');
      expect(String(m.createIfNotExists._id)).not.toContain('placeholder');
      expect(m.createIfNotExists.cardImage).toMatchObject({
        _type: 'image',
        asset: { _type: 'reference' },
      });
      expect(String((m.createIfNotExists.cardImage as { alt: string }).alt).length).toBeGreaterThan(
        20,
      );
    }
    const free = mutations.filter((m) => m.createIfNotExists.freeAccess === true);
    expect(free.map((m) => m.createIfNotExists._id).sort()).toEqual(
      FREE_SLUGS.map(powerDropDocId).sort(),
    );
  });

  it('attaches each image to its own PowerDrop (file → slug mapping holds through the upload)', async () => {
    const io = fakeIo(PLACEHOLDERS);
    await runPowerDropImport(manifest, io, { execute: true });
    const mutations = io.mutate.mock.calls[0]![0] as {
      createIfNotExists: { _id: string; cardImage: { asset: { _ref: string } } };
    }[];
    for (const entry of manifest.powerDrops) {
      const doc = mutations.find((m) => m.createIfNotExists._id === powerDropDocId(entry.slug))!;
      expect(doc.createIfNotExists.cardImage.asset._ref).toBe(`image-${entry.artworkSource}`);
    }
  });

  it('with no artwork named it still creates the drafts and uploads nothing', async () => {
    const m = clone();
    for (const d of m.powerDrops) {
      d.artworkSource = null;
      d.artworkAlt = null;
    }
    const io = fakeIo(PLACEHOLDERS);
    await runPowerDropImport(m, io, { execute: true });
    expect(io.uploadArtwork).not.toHaveBeenCalled();
    const mutations = io.mutate.mock.calls[0]![0] as {
      createIfNotExists: Record<string, unknown>;
    }[];
    for (const x of mutations) expect(x.createIfNotExists).not.toHaveProperty('cardImage');
  });

  it('is idempotent: a second run over existing documents that already have artwork changes nothing', async () => {
    const existing = [
      ...PLACEHOLDERS,
      ...manifest.powerDrops.map((d) => ({
        _id: powerDropDocId(d.slug),
        title: d.title,
        status: 'draft',
        hasCardImage: true,
      })),
    ];
    const io = fakeIo(existing);
    const result = await runPowerDropImport(manifest, io, { execute: true });
    expect(result.created).toBe(0);
    expect(result.existing).toBe(9);
    expect(io.uploadArtwork).not.toHaveBeenCalled();
    expect(io.mutate).not.toHaveBeenCalled();
  });

  it('attaches artwork to existing drafts that have none, with setIfMissing, and touches nothing else', async () => {
    const existing = manifest.powerDrops.map((d) => ({
      _id: powerDropDocId(d.slug),
      title: d.title,
      status: 'draft',
      hasCardImage: false,
    }));
    const io = fakeIo([...PLACEHOLDERS, ...existing]);
    await runPowerDropImport(manifest, io, { execute: true });
    const mutations = io.mutate.mock.calls[0]![0] as {
      patch: { id: string; setIfMissing: unknown };
    }[];
    expect(mutations).toHaveLength(9);
    for (const m of mutations) {
      expect(Object.keys(m)).toEqual(['patch']);
      expect(m.patch).toHaveProperty('setIfMissing.cardImage');
      expect(m.patch.id).not.toContain('placeholder');
    }
  });
});
