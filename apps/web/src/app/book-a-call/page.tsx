import type { Metadata } from 'next';
import { Container, PageQuote, Section } from '@tnsi/ui';
import { AlternativeContact } from '@/components/discovery-call/alternative-contact';
import { BookingSection } from '@/components/discovery-call/booking-section';
import { DiscoveryClosing } from '@/components/discovery-call/discovery-closing';
import { DiscoveryHero } from '@/components/discovery-call/discovery-hero';
import { EligibilitySection } from '@/components/discovery-call/eligibility-section';
import { FAQAccordion } from '@/components/discovery-call/faq-accordion';
import { MeetCarolineSection } from '@/components/discovery-call/meet-caroline-section';
import { ProcessSteps } from '@/components/discovery-call/process-steps';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { discoveryCallContent } from '@/content/discovery-call';

const { seo, footerQuote } = discoveryCallContent;

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  openGraph: {
    title: seo.title,
    description: seo.description,
  },
};

export default function BookACallPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-background">
        <DiscoveryHero />
        <ProcessSteps />
        <EligibilitySection />
        <MeetCarolineSection />
        <FAQAccordion />
        <BookingSection />
        <AlternativeContact />
        <DiscoveryClosing />

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
