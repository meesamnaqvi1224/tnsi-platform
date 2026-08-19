/**
 * Manual recovery: re-sync a single Sanity `practice` document into
 * Postgres if the webhook missed it. Fetches the published document from
 * Sanity, then sends it through the *real* /api/webhooks/sanity endpoint
 * with a correctly signed request — so it exercises the exact same
 * mapping/upsert logic the webhook uses, with zero duplicated database
 * code (a plain Node script can't import the TypeScript `@tnsi/db`/`@tnsi/cms`
 * workspace packages directly; this repo has no ts-node/tsx runner, and
 * adding one just for a recovery script isn't warranted).
 *
 * Run from apps/web:
 *   SANITY_WEBHOOK_SECRET=… node scripts/sync-practice.mjs <sanityId>
 *
 * Optional:
 *   SYNC_TARGET_URL=http://localhost:3000/api/webhooks/sanity   (defaults to production)
 *   SANITY_API_READ_TOKEN=…                                     (to read unpublished/private content)
 */
import { createHmac } from 'node:crypto';
import { createClient } from '@sanity/client';

const sanityId = process.argv[2];
if (!sanityId) {
  console.error('Usage: node scripts/sync-practice.mjs <sanityId>');
  process.exit(1);
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const webhookSecret = process.env.SANITY_WEBHOOK_SECRET;
if (!projectId || !webhookSecret) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_WEBHOOK_SECRET');
  process.exit(1);
}

const targetUrl =
  process.env.SYNC_TARGET_URL || 'https://thenervoussysteminstitute.com/api/webhooks/sanity';

const client = createClient({
  projectId,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-10-01',
  token: process.env.SANITY_API_READ_TOKEN || undefined,
  useCdn: false,
  perspective: 'published',
});

function base64UrlEncode(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signPayload(rawBody, secret) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const digest = base64UrlEncode(
    createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest(),
  );
  return `t=${timestamp},v1=${digest}`;
}

async function run() {
  const doc = await client.fetch(
    `*[_id == $id][0]{
      title, description, contentType, mediaUrl, thumbnailUrl,
      durationSeconds, category, tags, difficulty, status
    }`,
    { id: sanityId },
  );

  const payload = {
    _id: sanityId,
    _type: 'practice',
    operation: doc ? 'update' : 'delete',
    document: doc ?? null,
  };

  const rawBody = JSON.stringify(payload);
  const signature = signPayload(rawBody, webhookSecret);

  console.log(doc ? `Found "${doc.title}" — syncing...` : `No document found — deactivating...`);

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'sanity-webhook-signature': signature,
    },
    body: rawBody,
  });

  const result = await response.json().catch(() => null);
  console.log(`${response.status} ${response.statusText}`, result ?? '');

  if (!response.ok) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
