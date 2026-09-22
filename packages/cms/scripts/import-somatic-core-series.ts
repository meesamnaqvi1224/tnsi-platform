/**
 * Focused, idempotent bulk importer for the TNSI Somatic Core Series
 * (Series 01-05, Cards 1-50) - NOT a generic CMS migration platform.
 * Reads the repository-controlled manifest at
 * `content/somatic-cards/core-series-01-05.json` and writes Series/Card
 * documents (+ uploads their artwork) directly to Sanity via the
 * project's Content Lake HTTP API - the same "Sanity is the editorial
 * source of truth" pipeline every other Somatic Card milestone has used.
 *
 * Never writes to Postgres directly - Postgres is only ever updated by
 * the real webhook/sync pipeline (`/api/webhooks/sanity-somatic`),
 * unchanged by this script.
 *
 * Usage:
 *   pnpm --filter @tnsi/cms exec tsx scripts/import-somatic-core-series.ts --dry-run
 *   pnpm --filter @tnsi/cms exec tsx scripts/import-somatic-core-series.ts --execute
 *
 * Requires (read from apps/web/.env.local, never printed):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_WRITE_TOKEN
 *
 * Optional:
 *   --artwork-dir <path>   Directory containing the source artwork files
 *                          named in the manifest's `artworkSource` field.
 *                          Defaults to $SOMATIC_ARTWORK_DIR, then a
 *                          repo-relative `.local/somatic-artwork` (never
 *                          committed - see .gitignore).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateManifest, seriesDocId, cardDocId, type Manifest } from './somatic-import-lib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

// ---------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------
const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const DRY_RUN = !EXECUTE;
const artworkDirArgIdx = args.indexOf('--artwork-dir');
const artworkDirArg = artworkDirArgIdx >= 0 ? args[artworkDirArgIdx + 1] : undefined;
const ARTWORK_DIR: string =
  artworkDirArg ??
  process.env.SOMATIC_ARTWORK_DIR ??
  path.join(REPO_ROOT, '.local', 'somatic-artwork');

// ---------------------------------------------------------------------
// Env (read directly from apps/web/.env.local - never printed/logged)
// ---------------------------------------------------------------------
function readEnvVar(name: string): string {
  const envPath = path.join(REPO_ROOT, 'apps/web/.env.local');
  const content = readFileSync(envPath, 'utf-8');
  const line = content.split('\n').find((l) => l.startsWith(`${name}=`));
  if (!line) throw new Error(`${name} not found in apps/web/.env.local`);
  return line.slice(name.length + 1).trim();
}

const PROJECT_ID = readEnvVar('NEXT_PUBLIC_SANITY_PROJECT_ID');
const DATASET = readEnvVar('NEXT_PUBLIC_SANITY_DATASET');
const API_VERSION = '2024-10-01';
const WRITE_TOKEN = EXECUTE ? readEnvVar('SANITY_API_WRITE_TOKEN') : '';
// Reads (existing-document lookups) need a real token in both dry-run and
// execute mode - the dataset isn't publicly readable without one. Falls
// back to the write token if no separate read token is configured.
const READ_TOKEN = readEnvVar('SANITY_API_READ_TOKEN') || WRITE_TOKEN;

if (DATASET !== 'production' || PROJECT_ID !== 'hookrbdv') {
  throw new Error(
    `Refusing to run: expected project "hookrbdv" / dataset "production", got "${PROJECT_ID}"/"${DATASET}". This importer never changes dataset.`,
  );
}

const BASE = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}`;

async function sanityQuery<T>(groq: string): Promise<T> {
  const url = `${BASE}/data/query/${DATASET}?query=${encodeURIComponent(groq)}`;
  const res = await fetch(url, {
    headers: READ_TOKEN ? { Authorization: `Bearer ${READ_TOKEN}` } : {},
  });
  const body = (await res.json()) as { result?: T; error?: unknown };
  if (!res.ok || body.result === undefined) {
    throw new Error(`Sanity query failed: ${JSON.stringify(body)}`);
  }
  return body.result;
}

async function sanityMutate(mutations: unknown[]): Promise<unknown> {
  const res = await fetch(`${BASE}/data/mutate/${DATASET}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WRITE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Sanity mutate failed: ${JSON.stringify(body)}`);
  return body;
}

async function uploadImageAsset(filePath: string): Promise<string> {
  const data = readFileSync(filePath);
  const contentType = filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
  const res = await fetch(`${BASE}/assets/images/${DATASET}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WRITE_TOKEN}`, 'Content-Type': contentType },
    body: data,
  });
  const body = (await res.json()) as { document?: { _id: string }; error?: unknown };
  if (!res.ok || !body.document)
    throw new Error(`Asset upload failed for ${filePath}: ${JSON.stringify(body)}`);
  return body.document._id;
}

// ---------------------------------------------------------------------
// Manifest validation (structural - matches the approved Sanity schema's
// required fields; does not invent or repair content)
// ---------------------------------------------------------------------
async function main() {
  console.log(`\n=== TNSI Somatic Core Series Importer (${DRY_RUN ? 'DRY RUN' : 'EXECUTE'}) ===\n`);
  console.log(`Sanity project: ${PROJECT_ID}  dataset: ${DATASET}`);
  console.log(`Artwork directory: ${ARTWORK_DIR}\n`);

  const manifestPath = path.join(REPO_ROOT, 'content/somatic-cards/core-series-01-05.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Manifest;

  const validationErrors = validateManifest(manifest);
  if (validationErrors.length > 0) {
    console.error('Manifest validation FAILED:');
    for (const e of validationErrors) console.error(`  - ${e}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `Manifest valid: ${manifest.series.length} series, ${manifest.cards.length} cards.\n`,
  );

  // Existing documents (duplicate/idempotency check)
  const existing = await sanityQuery<{ _id: string; _type: string }[]>(
    '*[_type in ["somaticSeries","somaticCard"]]{_id,_type}',
  );
  const existingIds = new Set(existing.map((d) => d._id));
  console.log(`Found ${existingIds.size} existing Somatic document(s) in Sanity.\n`);

  let artworkMatched = 0;
  let artworkMissing = 0;
  let structuredOk = 0;
  let needsReview = 0;
  const missingArtworkCards: number[] = [];
  const readyCards: number[] = [];
  const failedCards: { cardNumber: number; error: string }[] = [];

  const mutations: unknown[] = [];

  // --- Series (before Cards) ---
  for (const s of manifest.series) {
    const id = seriesDocId(s.seriesNumber);
    const isNew = !existingIds.has(id);
    console.log(
      `Series ${s.seriesNumber} (${s.title}): ${isNew ? 'CREATE' : 'RECONCILE (exists)'} [${id}]`,
    );
    mutations.push({
      createOrReplace: {
        _id: id,
        _type: 'somaticSeries',
        seriesNumber: s.seriesNumber,
        title: s.title,
        slug: {
          _type: 'slug',
          current: s.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
        },
        collection: manifest.collection,
        coreQuestion: s.coreQuestion,
        status: 'draft',
        sortOrder: s.seriesNumber,
      },
    });
  }

  // --- Cards ---
  for (const c of manifest.cards) {
    try {
      const artworkPath = path.join(ARTWORK_DIR, c.artworkSource);
      const hasArtwork = existsSync(artworkPath);
      if (hasArtwork) artworkMatched++;
      else {
        artworkMissing++;
        missingArtworkCards.push(c.cardNumber);
      }

      const hasStructuredContent =
        c.practiceSteps.length > 0 && c.whatToNotice.length > 0 && !!c.anchor && !!c.gentleNote;
      if (hasStructuredContent) structuredOk++;
      if (c.needsReview) needsReview++;

      const id = cardDocId(c.seriesNumber, c.cardNumber);
      const isNew = !existingIds.has(id);
      const status = hasArtwork ? 'CREATE/UPDATE' : 'SKIP (no artwork found)';
      console.log(
        `Card ${c.cardNumber} - ${c.title}: ${isNew ? 'new' : 'existing'} ${status}${c.needsReview ? '  [needsReview]' : ''}`,
      );

      if (!hasArtwork) continue; // Part 4: continue-on-item-error, don't block the batch

      let assetId: string | undefined;
      if (EXECUTE) {
        assetId = await uploadImageAsset(artworkPath);
      }

      const doc: Record<string, unknown> = {
        _id: id,
        _type: 'somaticCard',
        cardNumber: c.cardNumber,
        title: c.title,
        slug: { _type: 'slug', current: c.slug },
        series: { _type: 'reference', _ref: seriesDocId(c.seriesNumber) },
        status: 'draft',
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
      if (c.invitation) doc.invitation = c.invitation;
      if (c.purpose) doc.purpose = c.purpose;
      if (c.description) doc.description = c.description;
      if (c.orientation) doc.orientation = c.orientation;
      if (c.gentleNote) doc.gentleNote = c.gentleNote;
      if (c.anchor) doc.anchor = c.anchor;
      if (assetId) {
        doc.cardArtwork = { _type: 'image', asset: { _type: 'reference', _ref: assetId } };
      }

      mutations.push({ createOrReplace: doc });
      readyCards.push(c.cardNumber);
    } catch (err) {
      failedCards.push({
        cardNumber: c.cardNumber,
        error: err instanceof Error ? err.message : String(err),
      });
      console.error(`  Card ${c.cardNumber} FAILED: ${err instanceof Error ? err.message : err}`);
      // continue-on-item-error: do not rethrow, move to next card
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Series discovered: ${manifest.series.length}`);
  console.log(`Cards discovered: ${manifest.cards.length}`);
  console.log(`Artwork matched: ${artworkMatched}`);
  console.log(
    `Artwork missing: ${artworkMissing}${missingArtworkCards.length ? ` (cards ${missingArtworkCards.join(', ')})` : ''}`,
  );
  console.log(`Structured content complete: ${structuredOk}`);
  console.log(`Flagged needsReview: ${needsReview}`);
  console.log(`Ready to import: ${readyCards.length}`);
  console.log(`Failed (skipped, batch continued): ${failedCards.length}`);
  if (failedCards.length) {
    for (const f of failedCards) console.log(`  - Card ${f.cardNumber}: ${f.error}`);
  }
  console.log(
    `Excluded from manifest (no authoritative card number): ${manifest.excludedSource.length}`,
  );
  for (const ex of manifest.excludedSource) console.log(`  - "${ex.title}" (${ex.artworkSource})`);

  if (DRY_RUN) {
    console.log(
      '\nDry run complete - no writes were made. Re-run with --execute to write to Sanity.',
    );
    return;
  }

  console.log(
    `\nWriting ${mutations.length} mutations (${manifest.series.length} series + ${readyCards.length} cards)...`,
  );
  await sanityMutate(mutations);
  console.log('Done.');
}

main().catch((err) => {
  console.error('Importer failed:', err);
  process.exitCode = 1;
});
