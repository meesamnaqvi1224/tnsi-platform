import { Container, PageQuote, Section } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { EaAreas } from '@/components/programs/executive-advisory/ea-areas';
import { EaAudience } from '@/components/programs/executive-advisory/ea-audience';
import { EaChallenge } from '@/components/programs/executive-advisory/ea-challenge';
import { EaCta } from '@/components/programs/executive-advisory/ea-cta';
import { EaFaq } from '@/components/programs/executive-advisory/ea-faq';
import { EaFounder } from '@/components/programs/executive-advisory/ea-founder';
import { EaHero } from '@/components/programs/executive-advisory/ea-hero';
import { EaJourney } from '@/components/programs/executive-advisory/ea-journey';
import { EaOutcomes } from '@/components/programs/executive-advisory/ea-outcomes';
import { executiveAdvisoryContent } from '@/content/executive-advisory';

const { seo, footerQuote } = executiveAdvisoryContent;

import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Executive Advisory',
  description: seo.description,
  path: '/programs/executive-advisory',
});

export default function ExecutiveAdvisoryPage() {
  const jsonLd = [
    createWebPageJsonLd({
      title: 'Executive Advisory',
      description: seo.description,
      path: '/programs/executive-advisory',
    }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Programs', path: '/programs' },
      { name: 'Executive Advisory', path: '/programs/executive-advisory' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main>
        <EaHero />
        <EaChallenge />
        <EaAudience />
        <EaAreas />
        <EaJourney />
        <EaOutcomes />
        <EaFounder />
        <EaFaq />
        <EaCta />

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
