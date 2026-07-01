import type { Metadata } from 'next';
import { Container, PageQuote, Section } from '@tnsi/ui';
import { CollaborationCTA } from '@/components/contact/collaboration-cta';
import { ContactClosing } from '@/components/contact/contact-closing';
import { ContactForm } from '@/components/contact/contact-form';
import { ContactHero } from '@/components/contact/contact-hero';
import { ContactMethods } from '@/components/contact/contact-methods';
import { FAQAccordion } from '@/components/contact/faq-accordion';
import { VisitSection } from '@/components/contact/visit-section';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { contactContent } from '@/content/contact';

const { seo, footerQuote } = contactContent;

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  openGraph: {
    title: seo.title,
    description: seo.description,
  },
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <ContactHero />
        <ContactMethods />
        <ContactForm />
        <FAQAccordion />
        <VisitSection />
        <CollaborationCTA />
        <ContactClosing />

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
