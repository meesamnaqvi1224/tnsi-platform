import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/json-ld';
import { AssessmentExperience } from '@/components/assessment/assessment-experience';
import { AssessmentUnavailable } from '@/components/assessment/assessment-unavailable';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { getAssessmentBySlug } from '@/content/cms/loaders';
import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

/**
 * The one assessment this route serves today. The route itself is
 * necessarily specific to Capacity Assessment (that's the product ask),
 * but everything it renders — questions, choices, scoring, results — comes
 * from the Sanity document this slug resolves to, via the fully generic
 * assessment data model (packages/cms, packages/core, packages/db). Adding
 * a second assessment later means a new route with a different slug, not a
 * change to any of those generic layers.
 */
const ASSESSMENT_SLUG = 'capacity-assessment';

const FALLBACK_TITLE = 'Capacity Assessment';
const FALLBACK_DESCRIPTION =
  "Take the Institute's Capacity Assessment to understand where you are today and what might help.";

export async function generateMetadata(): Promise<Metadata> {
  const assessment = await getAssessmentBySlug(ASSESSMENT_SLUG);

  return createPageMetadata({
    title: assessment?.seo?.seoTitle ?? assessment?.title ?? FALLBACK_TITLE,
    description: assessment?.seo?.seoDescription ?? FALLBACK_DESCRIPTION,
    path: '/assessment',
    // Nothing to show yet — keep the empty state out of search results.
    noIndex: !assessment,
  });
}

export default async function AssessmentPage() {
  const assessment = await getAssessmentBySlug(ASSESSMENT_SLUG);
  const title = assessment?.title ?? FALLBACK_TITLE;

  const jsonLd = [
    createWebPageJsonLd({ title, description: FALLBACK_DESCRIPTION, path: '/assessment' }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: title, path: '/assessment' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
        {assessment ? <AssessmentExperience assessment={assessment} /> : <AssessmentUnavailable />}
      </main>
      <SiteFooter />
    </>
  );
}
