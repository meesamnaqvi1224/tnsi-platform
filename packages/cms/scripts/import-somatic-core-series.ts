/**
 * Focused importer for the TNSI Somatic Core Series (Series 01-05, Cards 1-50) - NOT a generic CMS
 * migration platform. Reads the repository-controlled manifest at
 * `content/somatic-cards/core-series-01-05.json` and brings the Series/Card documents in Sanity in line
 * with it, via the project's Content Lake HTTP API.
 *
 * Never writes to Postgres directly - Postgres is only ever updated by the real webhook/sync pipeline
 * (`/api/webhooks/sanity-somatic`), unchanged by this script.
 *
 * SAFETY (changed 25 Nov 2026). Sanity has a single dataset, `production`, so any real run changes the
 * live site. This script therefore:
 *  - defaults to a DRY RUN that prints the exact plan and writes nothing;
 *  - refuses a real run unless `--allow-production` is passed AND the dataset name is typed back (at the
 *    prompt, or `--confirm-dataset production`);
 *  - never replaces a document: missing ones are created as drafts, existing ones are patched field by
 *    field, and only where the manifest differs;
 *  - never changes `status`, `hetConditions` or `protectionPatterns` on a document that exists, and
 *    leaves existing series completely alone (see somatic-import-plan.ts);
 *  - aborts if one run would change more than `--max-changes` documents (default 10);
 *  - before any write, saves a full export of the dataset and a copy of every document it will change
 *    to `.local/backups/`, and aborts if either cannot be written or checked.
 *
 * Usage:
 *   pnpm --filter @tnsi/cms exec tsx scripts/import-somatic-core-series.ts                 # dry run
 *   pnpm --filter @tnsi/cms exec tsx scripts/import-somatic-core-series.ts --execute \
 *       --allow-production --confirm-dataset production [--max-changes N]
 *
 * Artwork: a card whose manifest `artworkSource` is `null` has no image by design (its image is
 * removed); a named file that exists in the artwork directory is uploaded and set; a named file that is
 * missing leaves the card's image as it is.
 *
 * Requires (read from apps/web/.env.local, never printed):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_WRITE_TOKEN
 *
 * Optional:
 *   --artwork-dir <path>   Directory containing the source artwork files named in the manifest's
 *                          `artworkSource` field. Defaults to $SOMATIC_ARTWORK_DIR, then a
 *                          repo-relative `.local/somatic-artwork` (never committed - see .gitignore).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { cardDocId, validateManifest, type Manifest } from './somatic-import-lib';
import {
  backupFileName,
  checkChangeLimit,
  checkWriteGuard,
  parseMaxChanges,
  verifyExport,
} from './import-guard';
import { buildPlan, formatPlan, type ExistingDoc, type PlanItem } from './somatic-import-plan';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const BACKUP_DIR = path.join(REPO_ROOT, '.local', 'backups');

// ---------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------
const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const DRY_RUN = !EXECUTE;
const ALLOW_PRODUCTION = args.includes('--allow-production');
const argValue = (flag: string): string | undefined => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const ARTWORK_DIR: string =
  argValue('--artwork-dir') ??
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

/** Saves every document in the dataset (one JSON document per line) and returns the lines. Throws on any failure. */
async function exportDataset(file: string): Promise<string[]> {
  const res = await fetch(`${BASE}/data/export/${DATASET}`, {
    headers: { Authorization: `Bearer ${WRITE_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Dataset export failed: HTTP ${res.status}`);
  const text = await res.text();
  writeFileSync(file, text);
  return text.split('\n').filter((l) => l.trim().length > 0);
}

/** The typed confirmation: the dataset name, from `--confirm-dataset` or typed at the prompt. */
async function confirmedDataset(): Promise<string | null> {
  const fromFlag = argValue('--confirm-dataset');
  if (fromFlag !== undefined) return fromFlag;
  if (!EXECUTE || !ALLOW_PRODUCTION || !process.stdin.isTTY) return null;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (
      await rl.question(
        `This changes the LIVE "${DATASET}" dataset. Type the dataset name to continue: `,
      )
    ).trim();
  } finally {
    rl.close();
  }
}

async function main() {
  console.log(`\n=== TNSI Somatic Core Series Importer (${DRY_RUN ? 'DRY RUN' : 'EXECUTE'}) ===\n`);
  console.log(`Sanity project: ${PROJECT_ID}  dataset: ${DATASET}`);
  console.log(`Artwork directory: ${ARTWORK_DIR}\n`);

  // 1. The guard comes first: nothing below runs (or even reads the manifest) for an unconfirmed write.
  const guardErrors = checkWriteGuard({
    execute: EXECUTE,
    allowProduction: ALLOW_PRODUCTION,
    confirmedDataset: await confirmedDataset(),
    dataset: DATASET,
  });
  if (guardErrors.length > 0) {
    for (const e of guardErrors) console.error(`REFUSED: ${e}`);
    process.exitCode = 1;
    return;
  }
  const maxChanges = parseMaxChanges(argValue('--max-changes'));

  // 2. Manifest.
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

  // 3. The plan: what exists, and exactly what would change. Printed before anything else happens.
  const docs = await sanityQuery<ExistingDoc[]>('*[_type in ["somaticSeries","somaticCard"]]');
  const existing = new Map(docs.map((d) => [d._id, d]));
  console.log(`Found ${existing.size} existing Somatic document(s) in Sanity.\n`);
  const plan = buildPlan(manifest, existing, {
    artworkFileExists: (c) =>
      c.artworkSource !== null && existsSync(path.join(ARTWORK_DIR, c.artworkSource)),
  });
  console.log('=== Plan ===');
  for (const line of formatPlan(plan)) console.log(line);

  if (plan.violations.length > 0) {
    console.error('\nThe plan breaks a safety rule and will not run.');
    process.exitCode = 1;
    return;
  }
  if (DRY_RUN) {
    console.log(
      '\nDry run complete - no writes were made. To write, re-run with --execute --allow-production --confirm-dataset production.',
    );
    return;
  }
  if (plan.changedDocs === 0) {
    console.log('\nNothing to change. No backup was made and nothing was written.');
    return;
  }
  const limitError = checkChangeLimit(plan.changedDocs, maxChanges);
  if (limitError) {
    console.error(`\nREFUSED: ${limitError}`);
    process.exitCode = 1;
    return;
  }

  // 4. A way back, BEFORE any write (an uploaded image is a write too). Abort if it cannot be made.
  mkdirSync(BACKUP_DIR, { recursive: true });
  const now = new Date();
  const exportFile = path.join(BACKUP_DIR, backupFileName('sanity-export', DATASET, 'ndjson', now));
  const docsFile = path.join(
    BACKUP_DIR,
    backupFileName('somatic-docs-before', DATASET, 'json', now),
  );
  console.log(`\nSaving a full export of the "${DATASET}" dataset...`);
  const liveCount = await sanityQuery<number>('count(*)');
  const touched = plan.items.filter(
    (i): i is Extract<PlanItem, { kind: 'patch' }> => i.kind === 'patch',
  );
  const exported = await exportDataset(exportFile);
  const exportErrors = verifyExport(exported, { requiredIds: touched.map((t) => t.id), liveCount });
  if (exportErrors.length > 0) {
    console.error('REFUSED: the export is not usable, so nothing was written:');
    for (const e of exportErrors) console.error(`  - ${e}`);
    process.exitCode = 1;
    return;
  }
  writeFileSync(
    docsFile,
    JSON.stringify(
      touched.map((t) => existing.get(t.id)),
      null,
      2,
    ),
  );
  console.log(`  export: ${exportFile} (${exported.length} documents)`);
  console.log(`  documents about to change: ${docsFile}`);

  // 5. Artwork uploads (only for cards that are changing), then ONE all-or-nothing transaction.
  const assetFor = new Map<string, string>();
  for (const item of plan.items) {
    if (item.kind === 'skip' || item.artwork !== 'upload') continue;
    const card = manifest.cards.find((c) => cardDocId(c.seriesNumber, c.cardNumber) === item.id);
    if (!card || card.artworkSource === null) continue;
    assetFor.set(item.id, await uploadImageAsset(path.join(ARTWORK_DIR, card.artworkSource)));
  }
  const imageRef = (id: string) => ({
    _type: 'image',
    asset: { _type: 'reference', _ref: assetFor.get(id) },
  });

  const mutations: unknown[] = [];
  for (const item of plan.items) {
    if (item.kind === 'create') {
      const doc = assetFor.has(item.id)
        ? { ...item.doc, cardArtwork: imageRef(item.id) }
        : item.doc;
      mutations.push({ createIfNotExists: doc });
    } else if (item.kind === 'patch') {
      const set = assetFor.has(item.id)
        ? { ...item.set, cardArtwork: imageRef(item.id) }
        : item.set;
      mutations.push({
        patch: {
          id: item.id,
          ifRevisionID: item.rev,
          ...(Object.keys(set).length > 0 ? { set } : {}),
          ...(item.unset.length > 0 ? { unset: item.unset } : {}),
        },
      });
    }
  }
  console.log(`\nWriting ${mutations.length} mutation(s) in one transaction...`);
  await sanityMutate(mutations);
  console.log('Done. To undo, restore from the backup files above.');
}

main().catch((err) => {
  console.error('Importer failed:', err);
  process.exitCode = 1;
});
