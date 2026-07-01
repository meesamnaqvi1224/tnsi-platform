import { Container, PageQuote, Section } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ResourcesCategories } from '@/components/resources/resources-categories';
import { ResourcesClosing } from '@/components/resources/resources-closing';
import { ResourcesCollections } from '@/components/resources/resources-collections';
import { ResourcesFeatured } from '@/components/resources/resources-featured';
import { ResourcesGuides } from '@/components/resources/resources-guides';
import { ResourcesHero } from '@/components/resources/resources-hero';
import { ResourcesLatest } from '@/components/resources/resources-latest';
import { ResourcesNewsletter } from '@/components/resources/resources-newsletter';
import { resourcesContent } from '@/content/resources';

const { seo, footerQuote } = resourcesContent;

import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Resources',
  description: seo.description,
  path: '/resources',
});

export default function ResourcesPage() {
  const jsonLd = [
    createWebPageJsonLd({ title: 'Resources', description: seo.description, path: '/resources' }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Resources', path: '/resources' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main>
        <ResourcesHero />
        <ResourcesFeatured />
        <ResourcesCategories />
        <ResourcesLatest />
        <ResourcesCollections />
        <ResourcesGuides />
        <ResourcesNewsletter />
        <ResourcesClosing />

        <Section spacing="md" className="border-border border-t">
          <Container size="xl">
            <PageQuote quote={footerQuote.quote} author={footerQuote.author} />
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
