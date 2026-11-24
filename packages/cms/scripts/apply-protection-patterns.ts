/**
 * Applies the protection-pattern tags in `content/protection-patterns-v1.json` to PowerDrops and
 * Somatic Cards in Sanity by setting their `protectionPatterns` field. It touches ONLY that field, on
 * existing documents; it creates nothing and never writes to Postgres. No app code reads the field
 * yet, so applying it changes nothing a member sees.
 *
 * The tags are DRAFTS seeded from the content workbook (see the file's own comment). Run the dry run
 * first and read it. A card whose list is empty in the file is left alone (never cleared).
 *
 * Re-run it after any re-import of Somatic Cards: the core-series importer uses createOrReplace and so
 * clears fields it does not own, `protectionPatterns` included.
 *
 * Usage:
 *   pnpm --filter @tnsi/cms exec tsx scripts/apply-protection-patterns.ts            # dry run (default)
 *   pnpm --filter @tnsi/cms exec tsx scripts/apply-protection-patterns.ts --execute
 *
 * Reads credentials from apps/web/.env.local (never printed).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const EXECUTE = process.argv.includes('--execute');

const PATTERN_IDS = new Set([
  'protective-anger-reactivity',
  'control-over-management',
  'injustice-defensive-bracing',
  'functional-overdrive',
  'hypervigilance',
  'relational-threat-social-withdrawal',
  'functional-freeze',
  'disconnection-numbing',
  'capacity-overload',
  'appeasement-boundary-loss',
  'emotional-absorption-over-responsibility',
  'self-silencing-approval-seeking',
  'visceral-alarm-gut-focused-distress',
]);

function envVar(name: string): string {
  const content = readFileSync(path.join(REPO_ROOT, 'apps/web/.env.local'), 'utf-8');
  const line = content.split('\n').find((l) => l.startsWith(`${name}=`));
  if (!line) throw new Error(`${name} not found in apps/web/.env.local`);
  return line.slice(name.length + 1).trim();
}

const PROJECT_ID = envVar('NEXT_PUBLIC_SANITY_PROJECT_ID');
const DATASET = envVar('NEXT_PUBLIC_SANITY_DATASET');
if (PROJECT_ID !== 'hookrbdv' || DATASET !== 'production') {
  throw new Error(`Refusing to run against ${PROJECT_ID}/${DATASET}.`);
}
const BASE = `https://${PROJECT_ID}.api.sanity.io/v2024-10-01/data`;

type Entry = { patterns: string[]; confidence: string };
type Seed = { somaticCards: Record<string, Entry>; powerDrops: Record<string, Entry> };
const seed = JSON.parse(
  readFileSync(path.join(REPO_ROOT, 'content/protection-patterns-v1.json'), 'utf-8'),
) as Seed;

for (const [kind, group] of Object.entries({
  somaticCards: seed.somaticCards,
  powerDrops: seed.powerDrops,
})) {
  for (const [slug, entry] of Object.entries(group)) {
    if (
      entry.patterns.length > 4 ||
      new Set(entry.patterns).size !== entry.patterns.length ||
      entry.patterns.some((p) => !PATTERN_IDS.has(p))
    ) {
      throw new Error(`Invalid patterns for ${kind}/${slug}: ${JSON.stringify(entry.patterns)}`);
    }
  }
}

async function query<T>(groq: string): Promise<T> {
  const res = await fetch(`${BASE}/query/${DATASET}?query=${encodeURIComponent(groq)}`, {
    headers: { Authorization: `Bearer ${envVar('SANITY_API_READ_TOKEN')}` },
  });
  const body = (await res.json()) as { result?: T };
  if (!res.ok || body.result === undefined)
    throw new Error(`Query failed: ${JSON.stringify(body)}`);
  return body.result;
}

async function main() {
  const docs = await query<
    { _id: string; _type: string; slug: string; protectionPatterns?: string[] }[]
  >(
    `*[_type in ["powerDrop","somaticCard"] && !(_id in path("drafts.**"))]{_id,_type,"slug":slug.current,protectionPatterns}`,
  );
  const bySlug = (type: string) =>
    new Map(docs.filter((d) => d._type === type).map((d) => [d.slug, d]));

  const mutations: unknown[] = [];
  const plan = (
    type: Map<string, (typeof docs)[number]>,
    group: Record<string, Entry>,
    label: string,
  ) => {
    for (const [slug, entry] of Object.entries(group)) {
      if (entry.patterns.length === 0) {
        console.log(`skip   ${label} ${slug}: no pattern in the workbook`);
        continue;
      }
      const doc = type.get(slug);
      if (!doc) throw new Error(`${label} "${slug}" not found in Sanity - nothing written.`);
      const same = JSON.stringify(doc.protectionPatterns ?? []) === JSON.stringify(entry.patterns);
      console.log(
        `${same ? 'same  ' : 'SET   '} ${label} ${slug}: ${entry.patterns.join(', ')} [${entry.confidence}]`,
      );
      if (!same)
        mutations.push({ patch: { id: doc._id, set: { protectionPatterns: entry.patterns } } });
    }
  };
  plan(bySlug('powerDrop'), seed.powerDrops, 'powerDrop');
  plan(bySlug('somaticCard'), seed.somaticCards, 'somaticCard');

  console.log(
    `\n${mutations.length} change(s) ${EXECUTE ? 'to apply' : '(dry run - pass --execute to apply)'}.`,
  );
  if (!EXECUTE || mutations.length === 0) return;
  const res = await fetch(`${BASE}/mutate/${DATASET}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${envVar('SANITY_API_WRITE_TOKEN')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mutations }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Mutate failed (nothing applied): ${JSON.stringify(body)}`);
  console.log('Applied.');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
