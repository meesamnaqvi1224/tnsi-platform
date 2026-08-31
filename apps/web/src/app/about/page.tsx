import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { AboutClosing } from '@/components/about/about-closing';
import { AboutHero } from '@/components/about/about-hero';
import { FounderSection } from '@/components/about/founder-section';
import { InstituteGlance } from '@/components/about/institute-glance';
import { MissionSection } from '@/components/about/mission-section';
import { TheoryTeaser } from '@/components/about/theory-teaser';
import { ValuesSection } from '@/components/about/values-section';

import { aboutContent } from '@/content/about';
import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

const PAGE_TITLE = 'About';
const PAGE_DESCRIPTION = aboutContent.seo.description;

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
        <TheoryTeaser />
        <ValuesSection />
        <FounderSection />
        <InstituteGlance />
        <AboutClosing />
      </main>
      <SiteFooter />
    </>
  );
}
