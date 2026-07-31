import { Container, PageQuote, Section } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
import { CtaBand } from '@/components/home/cta-band';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { MethodCredentials } from '@/components/method/method-credentials';
import { MethodFoundation } from '@/components/method/method-foundation';
import { MethodHero } from '@/components/method/method-hero';
import { MethodJourney } from '@/components/method/method-journey';
import { MethodQuote } from '@/components/method/method-quote';

import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

const PAGE_TITLE = 'The Method';
const PAGE_DESCRIPTION =
  'Life Beyond Trauma: an evidence-informed methodology built on fifteen years of clinical research into the nervous system, polyvagal theory, and sustainable high performance.';

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

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
        <MethodHero />

        {/* One sentence. One viewport. The thesis of everything that follows. */}
        <MethodQuote />

        <MethodFoundation />

        <MethodJourney />

        <MethodCredentials />

        <Section spacing="md" className="border-border border-t">
          <Container size="xl">
            <PageQuote
              quote="The body has always known what it needed. We are simply learning to listen."
              author="Caroline Reed — Founder &amp; Director"
            />
          </Container>
        </Section>

        <CtaBand />
      </main>
      <SiteFooter />
    </>
  );
}
