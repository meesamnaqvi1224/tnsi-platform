/**
 * Focused, idempotent importer for the guided exercises in `content/exercises/exercises-v1.json`.
 * Writes each exercise's content (`guidedExercise`) and the practice record that opens it
 * (`practice`, status DRAFT, so nothing is visible to members until it is published in Studio) to
 * Sanity through the Content Lake HTTP API, the same "Sanity is the editorial source of truth"
 * pipeline the other imports use. Never writes to Postgres: the practice reaches the database only
 * through the real webhook sync, and only once it is published.
 *
 * Re-running replaces the exercise content. It will NOT change a practice's status: an existing
 * practice document is left exactly as it is, so a published practice is never reset to draft.
 *
 * Usage:
 *   pnpm --filter @tnsi/cms exec tsx scripts/import-guided-exercises.ts --dry-run
 *   pnpm --filter @tnsi/cms exec tsx scripts/import-guided-exercises.ts --execute
 *
 * Requires (read from apps/web/.env.local, never printed):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_WRITE_TOKEN
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const EXECUTE = process.argv.includes('--execute');

type Json = Record<string, unknown>;
type Manifest = { exercises: Json[]; practices: Json[] };

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(path.join(REPO_ROOT, 'apps/web/.env.local'), 'utf8').split(
    '\n',
  )) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]!] = m[2]!.replace(/^["']|["']$/g, '');
  }
  return env;
}

const keyed = <T extends Json>(items: T[] | undefined, type: string, keyField = 'id') =>
  (items ?? []).map((item) => ({ _type: type, _key: String(item[keyField]), ...item }));

function exerciseDoc(e: Json): Json {
  const steps = keyed(e.steps as Json[], 'exerciseStep').map((step) => ({
    ...step,
    ...(Array.isArray(step.options)
      ? { options: keyed(step.options as Json[], 'exerciseOption') }
      : {}),
  }));
  const summary = e.summary as Json | undefined;
  return {
    _id: `guidedExercise.${e.slug}`,
    _type: 'guidedExercise',
    slug: { _type: 'slug', current: e.slug },
    title: e.title,
    subtitle: e.subtitle,
    intro: e.intro,
    durationLabel: e.durationLabel,
    steps,
    ...(summary
      ? {
          summary: {
            heading: summary.heading,
            intro: summary.intro,
            showAnswers: summary.showAnswers,
            compare: ((summary.compare as Json[]) ?? []).map((c) => ({
              _type: 'exerciseComparison',
              _key: String(c.beforeStepId),
              ...c,
            })),
          },
        }
      : {}),
    closing: e.closing,
  };
}

function practiceDoc(p: Json): Json {
  return {
    _id: `practice.exercise-${p.slug}`,
    _type: 'practice',
    title: p.title,
    description: p.description,
    contentType: 'interactive',
    interactiveKey: `exercise:${p.slug}`,
    tags: p.tags,
    durationSeconds: p.durationSeconds,
    difficulty: 1,
    freeAccess: false,
    status: 'draft',
  };
}

async function main() {
  const manifest = JSON.parse(
    readFileSync(path.join(REPO_ROOT, 'content/exercises/exercises-v1.json'), 'utf8'),
  ) as Manifest;
  const exercises = manifest.exercises.map(exerciseDoc);
  const practices = manifest.practices.map(practiceDoc);

  console.log(`${exercises.length} exercises, ${practices.length} draft practices`);
  if (!EXECUTE) {
    console.log('Dry run: nothing written. Re-run with --execute.');
    return;
  }

  const env = loadEnv();
  const project = env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = env.NEXT_PUBLIC_SANITY_DATASET;
  const token = env.SANITY_API_WRITE_TOKEN;
  if (!project || !dataset || !token) throw new Error('Sanity environment variables are missing.');

  const mutations = [
    ...exercises.map((doc) => ({ createOrReplace: doc })),
    // createIfNotExists: never resets the status of a practice that is already there.
    ...practices.map((doc) => ({ createIfNotExists: doc })),
  ];
  const res = await fetch(`https://${project}.api.sanity.io/v2024-01-01/data/mutate/${dataset}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations }),
  });
  if (!res.ok) throw new Error(`Sanity write failed: ${res.status} ${await res.text()}`);
  console.log(`Wrote ${mutations.length} documents.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
