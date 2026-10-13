/**
 * Focused, idempotent importer for the nine real PowerDrops™ in
 * `content/powerdrops/powerdrops-v1.json` (transcribed from the approved card
 * deck). Writes `powerDrop` documents to Sanity using only the fields the
 * existing schema defines — it changes no schema and never writes to Postgres
 * (PowerDrops are read live from Sanity).
 *
 * Safety:
 *  - DRY RUN by default. Nothing is written (no document, no upload) without
 *    `--execute`.
 *  - Documents are created as the manifest says: today every one is a
 *    `status: "draft"` (which the API never serves) and the three owner-
 *    confirmed free PowerDrops carry `freeAccess: true`. Publishing is a
 *    separate, deliberate step, and a PowerDrop cannot be marked published in
 *    the manifest without its artwork.
 *  - Documents are created with `createIfNotExists`, so a re-run never
 *    overwrites an edit made in Sanity Studio. The "[Placeholder]" documents
 *    are never modified or deleted by this script.
 *  - Card artwork is attached only when the manifest names a file
 *    (`artworkSource`) that exists in the artwork directory; none is set yet,
 *    so no image is uploaded.
 *
 * Usage:
 *   pnpm --filter @tnsi/cms exec tsx scripts/import-powerdrops.ts            # dry run
 *   pnpm --filter @tnsi/cms exec tsx scripts/import-powerdrops.ts --execute  # writes to Sanity
 *
 * Optional:
 *   --artwork-dir <path>   Directory holding the artwork files named in the
 *                          manifest. Defaults to $POWERDROP_ARTWORK_DIR, then
 *                          a repo-relative `.local/powerdrop-artwork` (not
 *                          committed - see .gitignore).
 *
 * Requires (read from apps/web/.env.local, never printed):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET,
 *   SANITY_API_READ_TOKEN, and SANITY_API_WRITE_TOKEN for --execute.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runPowerDropImport,
  type ExistingPowerDrop,
  type ImportIo,
  type PowerDropManifest,
} from './powerdrop-import-lib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const artworkDirArgIdx = args.indexOf('--artwork-dir');
const ARTWORK_DIR: string =
  (artworkDirArgIdx >= 0 ? args[artworkDirArgIdx + 1] : undefined) ??
  process.env.POWERDROP_ARTWORK_DIR ??
  path.join(REPO_ROOT, '.local', 'powerdrop-artwork');

function readEnvVar(name: string): string {
  const content = readFileSync(path.join(REPO_ROOT, 'apps/web/.env.local'), 'utf-8');
  const line = content.split('\n').find((l) => l.startsWith(`${name}=`));
  if (!line) throw new Error(`${name} not found in apps/web/.env.local`);
  return line
    .slice(name.length + 1)
    .trim()
    .replace(/^"|"$/g, '');
}

const PROJECT_ID = readEnvVar('NEXT_PUBLIC_SANITY_PROJECT_ID');
const DATASET = readEnvVar('NEXT_PUBLIC_SANITY_DATASET');
const API_VERSION = '2024-10-01';
const WRITE_TOKEN = EXECUTE ? readEnvVar('SANITY_API_WRITE_TOKEN') : '';
const READ_TOKEN = readEnvVar('SANITY_API_READ_TOKEN') || WRITE_TOKEN;

if (DATASET !== 'production' || PROJECT_ID !== 'hookrbdv') {
  throw new Error(
    `Refusing to run: expected project "hookrbdv" / dataset "production", got "${PROJECT_ID}"/"${DATASET}".`,
  );
}

const BASE = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}`;

const io: ImportIo = {
  async listExisting() {
    const groq = '*[_type == "powerDrop"]{_id, title, status, "hasCardImage": defined(cardImage)}';
    const res = await fetch(`${BASE}/data/query/${DATASET}?query=${encodeURIComponent(groq)}`, {
      headers: { Authorization: `Bearer ${READ_TOKEN}` },
    });
    const body = (await res.json()) as { result?: ExistingPowerDrop[]; error?: unknown };
    if (!res.ok || body.result === undefined) {
      throw new Error(`Sanity query failed: ${JSON.stringify(body)}`);
    }
    return body.result;
  },

  artworkExists(fileName) {
    return existsSync(path.join(ARTWORK_DIR, fileName));
  },

  async uploadArtwork(fileName) {
    const filePath = path.join(ARTWORK_DIR, fileName);
    const contentType = filePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const res = await fetch(`${BASE}/assets/images/${DATASET}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WRITE_TOKEN}`, 'Content-Type': contentType },
      body: readFileSync(filePath),
    });
    const body = (await res.json()) as { document?: { _id: string }; error?: unknown };
    if (!res.ok || !body.document) {
      throw new Error(`Asset upload failed for ${fileName}: ${JSON.stringify(body)}`);
    }
    return body.document._id;
  },

  async mutate(mutations) {
    const res = await fetch(`${BASE}/data/mutate/${DATASET}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WRITE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mutations }),
    });
    if (!res.ok) throw new Error(`Sanity mutate failed: ${JSON.stringify(await res.json())}`);
  },

  log: (line) => console.log(line),
};

async function main() {
  console.log(`\n=== PowerDrops™ importer (${EXECUTE ? 'EXECUTE' : 'DRY RUN'}) ===\n`);
  const manifest = JSON.parse(
    readFileSync(path.join(REPO_ROOT, 'content/powerdrops/powerdrops-v1.json'), 'utf-8'),
  ) as PowerDropManifest;
  console.log(`Artwork: ${manifest.artwork.status}`);
  console.log(`Free selection: ${manifest.freeSelection.status}\n`);

  const result = await runPowerDropImport(manifest, io, { execute: EXECUTE });
  if (!result.ok) {
    console.error('Import refused:');
    for (const e of result.errors) console.error(`  - ${e}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `\n${EXECUTE ? 'Created' : 'Would create'} ${EXECUTE ? result.created : result.planned}; ${result.existing} already present.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
