import { Container, PageQuote, Section } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
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

import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Contact',
  description: seo.description,
  path: '/contact',
});

export default function ContactPage() {
  const jsonLd = [
    createWebPageJsonLd({ title: 'Contact', description: seo.description, path: '/contact' }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Contact', path: '/contact' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
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
