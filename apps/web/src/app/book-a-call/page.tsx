import { Container, PageQuote, Section } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
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

import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Book a Discovery Call',
  description: seo.description,
  path: '/book-a-call',
});

export default function BookACallPage() {
  const jsonLd = [
    createWebPageJsonLd({
      title: 'Book a Discovery Call',
      description: seo.description,
      path: '/book-a-call',
    }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Book a Discovery Call', path: '/book-a-call' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
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
