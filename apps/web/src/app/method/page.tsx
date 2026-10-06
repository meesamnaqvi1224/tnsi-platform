import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { MethodFinalCta } from '@/components/method/method-final-cta';
import { MethodFoundation } from '@/components/method/method-foundation';
import { ChapterProgress } from '@/components/method/chapter-progress';
import { MethodHero } from '@/components/method/method-hero';
import { MethodJourney } from '@/components/method/method-journey';
import { MethodPractice } from '@/components/method/method-practice';
import { MethodProtectionParticipation } from '@/components/method/method-protection-participation';
import { MethodPullQuote } from '@/components/method/method-pull-quote';
import { MethodStatement } from '@/components/method/method-statement';
import { HumanExpansionPage } from '@/components/human-expansion-experience/HumanExpansionPage';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';
import { isHumanExpansion3dEnabled } from '@/lib/human-expansion-3d';

import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

const { seo } = humanExpansionTheoryContent;
const PAGE_TITLE = 'Human Expansion Theory™';
const PAGE_DESCRIPTION = seo.description;

export const metadata = createPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  path: '/method',
});

export default function MethodPage() {
  const jsonLd = [
    createWebPageJsonLd({ title: PAGE_TITLE, description: PAGE_DESCRIPTION, path: '/method' }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: PAGE_TITLE, path: '/method' },
    ]),
  ];

  // The 3D experience is behind a review switch (see lib/human-expansion-3d.ts):
  // metadata, JSON-LD and the page's identity are the same either way.
  if (isHumanExpansion3dEnabled()) {
    return (
      <>
        <JsonLd data={jsonLd} />
        <HumanExpansionPage />
      </>
    );
  }

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <ChapterProgress />
      <main id="main-content">
        <MethodHero />

        {/* One sentence. One pause. The thesis of everything that follows. */}
        <MethodStatement />

        <MethodFoundation />

        <MethodJourney />

        <MethodProtectionParticipation />

        <MethodPractice />

        <MethodPullQuote />

        <MethodFinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
