import type { Metadata } from 'next';
import { Container, PageQuote, Section } from '@tnsi/ui';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ResearchAreasSection } from '@/components/research/research-areas-section';
import { ResearchClosing } from '@/components/research/research-closing';
import { ResearchFaq } from '@/components/research/research-faq';
import { ResearchHero } from '@/components/research/research-hero';
import { ResearchInitiativesSection } from '@/components/research/research-initiatives-section';
import { ResearchPhilosophy } from '@/components/research/research-philosophy';
import { ResearchPillarsSection } from '@/components/research/research-pillars-section';
import { ResearchReferencesSection } from '@/components/research/research-references-section';
import { ResearchTimelineSection } from '@/components/research/research-timeline-section';
import { researchContent } from '@/content/research';

const { seo, footerQuote } = researchContent;

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  openGraph: {
    title: seo.title,
    description: seo.description,
  },
};

export default function ResearchPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <ResearchHero />
        <ResearchPhilosophy />
        <ResearchPillarsSection />
        <ResearchAreasSection />
        <ResearchTimelineSection />
        <ResearchReferencesSection />
        <ResearchInitiativesSection />
        <ResearchFaq />
        <ResearchClosing />

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
