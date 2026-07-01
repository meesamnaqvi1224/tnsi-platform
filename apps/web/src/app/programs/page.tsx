import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ProgramsCards } from '@/components/programs/programs-cards';
import { ProgramsComparison } from '@/components/programs/programs-comparison';
import { ProgramsCta } from '@/components/programs/programs-cta';
import { ProgramsFeatured } from '@/components/programs/programs-featured';
import { ProgramsHero } from '@/components/programs/programs-hero';
import { ProgramsJourney } from '@/components/programs/programs-journey';

import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

const PAGE_TITLE = 'Programs';
const PAGE_DESCRIPTION =
  'Three evidence-informed programs designed to meet you where you are: Life Beyond Trauma, Practitioner Certification and Executive Advisory. Find the right pathway for your journey.';

export const metadata = createPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  path: '/programs',
});

export default function ProgramsPage() {
  const jsonLd = [
    createWebPageJsonLd({ title: PAGE_TITLE, description: PAGE_DESCRIPTION, path: '/programs' }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: PAGE_TITLE, path: '/programs' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main>
        <ProgramsHero />
        <ProgramsCards />
        <ProgramsFeatured />
        <ProgramsComparison />
        <ProgramsJourney />
        <ProgramsCta />
      </main>
      <SiteFooter />
    </>
  );
}
