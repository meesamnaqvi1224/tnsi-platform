/**
 * Applies the approved Human Expansion Theory mapping
 * (`content/het-mapping-v1.json`) to PowerDrops and Somatic Cards in Sanity by
 * setting their `hetConditions` field. It touches ONLY that field, on existing
 * documents; it creates nothing and never writes to Postgres.
 *
 * Re-run it after any re-import of Somatic Cards: the core-series importer
 * uses createOrReplace and so clears `hetConditions`.
 *
 * Usage:
 *   pnpm --filter @tnsi/cms exec tsx scripts/apply-het-mapping.ts            # dry run (default)
 *   pnpm --filter @tnsi/cms exec tsx scripts/apply-het-mapping.ts --execute
 *
 * Reads credentials from apps/web/.env.local (never printed).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const EXECUTE = process.argv.includes('--execute');
const CONDITIONS = ['Safety', 'Capacity', 'Availability', 'Expansion', 'Participation'];

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

type Mapping = {
  somaticCards: Record<string, string[]>;
  powerDrops: Record<string, string[]>;
  excludedFromRecommendations: string[];
};
const mapping = JSON.parse(
  readFileSync(path.join(REPO_ROOT, 'content/het-mapping-v1.json'), 'utf-8'),
) as Mapping;

for (const [kind, group] of Object.entries({
  somaticCards: mapping.somaticCards,
  powerDrops: mapping.powerDrops,
})) {
  for (const [slug, conditions] of Object.entries(group)) {
    if (
      conditions.length < 1 ||
      conditions.length > 3 ||
      conditions.some((c) => !CONDITIONS.includes(c))
    ) {
      throw new Error(`Invalid conditions for ${kind}/${slug}: ${JSON.stringify(conditions)}`);
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
    { _id: string; _type: string; slug: string; hetConditions?: string[] }[]
  >(
    `*[_type in ["powerDrop","somaticCard"] && !(_id in path("drafts.**"))]{_id,_type,"slug":slug.current,hetConditions}`,
  );
  const bySlug = (type: string) =>
    new Map(docs.filter((d) => d._type === type).map((d) => [d.slug, d]));
  const drops = bySlug('powerDrop');
  const cards = bySlug('somaticCard');

  const mutations: unknown[] = [];
  const plan = (
    type: Map<string, (typeof docs)[number]>,
    group: Record<string, string[]>,
    label: string,
  ) => {
    for (const [slug, conditions] of Object.entries(group)) {
      const doc = type.get(slug);
      if (!doc) throw new Error(`${label} "${slug}" not found in Sanity - nothing written.`);
      const same = JSON.stringify(doc.hetConditions ?? []) === JSON.stringify(conditions);
      console.log(`${same ? 'same  ' : 'SET   '} ${label} ${slug}: ${conditions.join(', ')}`);
      if (!same) mutations.push({ patch: { id: doc._id, set: { hetConditions: conditions } } });
    }
  };
  plan(drops, mapping.powerDrops, 'powerDrop');
  plan(cards, mapping.somaticCards, 'somaticCard');
  for (const slug of mapping.excludedFromRecommendations) {
    const doc = cards.get(slug);
    if (doc?.hetConditions?.length) {
      console.log(`CLEAR  somaticCard ${slug} (open review flag)`);
      mutations.push({ patch: { id: doc._id, unset: ['hetConditions'] } });
    }
  }

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
