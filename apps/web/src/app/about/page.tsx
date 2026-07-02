import { CtaBand } from '@/components/home/cta-band';
import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { AboutHero } from '@/components/about/about-hero';
import { FounderSection } from '@/components/about/founder-section';
import { MissionSection } from '@/components/about/mission-section';
import { ValuesSection } from '@/components/about/values-section';

import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

const PAGE_TITLE = 'About';
const PAGE_DESCRIPTION =
  'Learn about The Nervous System Institute, its founder Caroline Reed, and the evidence-informed approach behind fifteen years of clinical research.';

export const metadata = createPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  path: '/about',
});

export default function AboutPage() {
  const jsonLd = [
    createWebPageJsonLd({ title: PAGE_TITLE, description: PAGE_DESCRIPTION, path: '/about' }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: PAGE_TITLE, path: '/about' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
        <AboutHero />
        <MissionSection />
        <FounderSection />
        <ValuesSection />
        <CtaBand />
      </main>
      <SiteFooter />
    </>
  );
}
