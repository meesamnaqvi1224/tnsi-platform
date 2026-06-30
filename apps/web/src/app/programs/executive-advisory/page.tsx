import type { Metadata } from 'next';
import { Container, PageQuote, Section } from '@tnsi/ui';
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

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  openGraph: {
    title: seo.title,
    description: seo.description,
  },
};

export default function ExecutiveAdvisoryPage() {
  return (
    <>
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
