import type { Metadata } from 'next';
import { Container, PageQuote, Section } from '@tnsi/ui';
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

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  openGraph: {
    title: seo.title,
    description: seo.description,
  },
};

export default function PractitionerCertificationPage() {
  return (
    <>
      <SiteHeader />
      <main>
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
