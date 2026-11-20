/**
 * Records a completed session of a standalone guided practice (90-Second Reset, The Empty Chair).
 * These practices are opened by a key, not a database id, so this route finds the published
 * practice that carries the key and hands the request to the ordinary
 * `POST /api/v1/practices/[id]/complete` route. Nothing about how a session is recorded, whether a
 * member can open the practice, or how a quick repeat is merged is decided here; this only resolves
 * the key. Nothing is stored beyond the standard completion row: no score, rating or text.
 */
import { and, eq } from 'drizzle-orm';
import { standaloneGuidedKey } from '@tnsi/core';
import { db } from '@tnsi/db';
import { practices } from '@tnsi/db/schema';
import { memberAccessErrorResponse, requireMemberAccess } from '@/lib/auth-api';
import { notFound } from '@/lib/api-response';
import { POST as recordCompletion } from '../../../[id]/complete/route';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ key: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    await requireMemberAccess();
  } catch (err) {
    return memberAccessErrorResponse(err);
  }

  const { key } = await params;
  if (!standaloneGuidedKey({ contentType: 'interactive', interactiveKey: key })) {
    return notFound('Practice not found');
  }

  const [practice] = await db
    .select({ id: practices.id })
    .from(practices)
    .where(
      and(
        eq(practices.contentType, 'interactive'),
        eq(practices.interactiveKey, key),
        eq(practices.isPublished, true),
      ),
    )
    .limit(1);
  if (!practice) return notFound('Practice not found');

  return recordCompletion(request, { params: Promise.resolve({ id: practice.id }) });
}
