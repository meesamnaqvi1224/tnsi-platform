import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ProgramsCta } from '@/components/programs/programs-cta';
import { ProgramsHero } from '@/components/programs/programs-hero';
import { ProgramsPathways } from '@/components/programs/programs-pathways';

import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

const PAGE_TITLE = 'Our Pathways';
const PAGE_DESCRIPTION =
  'The Nervous System Institute offers evidence-informed pathways that support human development across personal growth, professional practice, executive leadership, and organisational development.';

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
      <main id="main-content">
        <ProgramsHero />
        <ProgramsPathways />
        <ProgramsCta />
      </main>
      <SiteFooter />
    </>
  );
}
