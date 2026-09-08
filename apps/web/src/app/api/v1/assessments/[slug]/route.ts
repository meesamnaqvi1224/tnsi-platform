/**
 * Public read for the native mobile Capacity Assessment experience -
 * generic across every assessment slug the Sanity `assessment` document
 * type can define, not specific to Capacity Assessment. Backed by the
 * exact same `getAssessmentBySlug()` the web `/assessment` page already
 * uses (apps/web/src/content/cms/loaders.ts), so publication/draft
 * visibility is identical to the web experience with zero new logic.
 *
 * Intentionally unauthenticated, matching `POST /api/assessments/submit`:
 * the assessment is public, unauthenticated content on the web (see
 * `apps/web/src/middleware.ts`'s `isPublicRoute` list), so reading its
 * definition must not require a Clerk session either.
 */
import { getAssessmentBySlug } from '@/content/cms/loaders';
import { mapAssessment } from '@/lib/assessment-api';
import { assessmentSlugParamSchema } from '@/lib/validation';
import { success, badRequest, notFound } from '@/lib/api-response';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug: rawSlug } = await params;

  const parsed = assessmentSlugParamSchema.safeParse({ slug: rawSlug });
  if (!parsed.success) {
    return badRequest('Invalid slug', { errors: parsed.error.flatten().fieldErrors });
  }

  // getAssessmentBySlug() never throws - it returns null for an
  // unconfigured CMS, an unmatched slug, an unpublished document, or a
  // genuine Sanity fetch failure alike (see its own doc comment). All of
  // those read as "not currently available" here too, same as the web
  // assessment page's own not-found handling.
  const assessment = await getAssessmentBySlug(parsed.data.slug);

  if (!assessment) {
    return notFound('Assessment not found');
  }

  return success(mapAssessment(assessment));
}
