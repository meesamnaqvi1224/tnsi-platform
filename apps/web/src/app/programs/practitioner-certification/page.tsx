import { Container, PageQuote, Section } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { PcAudience } from '@/components/programs/practitioner-certification/pc-audience';
import { PcCta } from '@/components/programs/practitioner-certification/pc-cta';
import { PcCurriculum } from '@/components/programs/practitioner-certification/pc-curriculum';
import { PcExperience } from '@/components/programs/practitioner-certification/pc-experience';
import { PcFaq } from '@/components/programs/practitioner-certification/pc-faq';
import { PcFounder } from '@/components/programs/practitioner-certification/pc-founder';
import { PcHero } from '@/components/programs/practitioner-certification/pc-hero';
import { PcOutcomes } from '@/components/programs/practitioner-certification/pc-outcomes';
import { PcPurpose } from '@/components/programs/practitioner-certification/pc-purpose';
import { practitionerCertificationContent } from '@/content/practitioner-certification';

const { seo, footerQuote } = practitionerCertificationContent;

import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Practitioner Certification',
  description: seo.description,
  path: '/programs/practitioner-certification',
});

export default function PractitionerCertificationPage() {
  const jsonLd = [
    createWebPageJsonLd({
      title: 'Practitioner Certification',
      description: seo.description,
      path: '/programs/practitioner-certification',
    }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Programs', path: '/programs' },
      { name: 'Practitioner Certification', path: '/programs/practitioner-certification' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
        <PcHero />
        <PcAudience />
        <PcPurpose />
        <PcCurriculum />
        <PcExperience />
        <PcOutcomes />
        <PcFounder />
        <PcFaq />
        <PcCta />

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
