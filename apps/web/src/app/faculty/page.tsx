import { Container, PageQuote, Section } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
import { FacultyClosing } from '@/components/faculty/faculty-closing';
import { FacultyExpertiseSection } from '@/components/faculty/faculty-expertise-section';
import { FacultyHero } from '@/components/faculty/faculty-hero';
import { FacultyProfile } from '@/components/faculty/faculty-profile';
import { GuestFaculty } from '@/components/faculty/guest-faculty';
import { SpeakingSection } from '@/components/faculty/speaking-section';
import { TeachingPhilosophy } from '@/components/faculty/teaching-philosophy';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { facultyContent } from '@/content/faculty';

const { seo, footerQuote } = facultyContent;

import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Faculty',
  description: seo.description,
  path: '/faculty',
});

export default function FacultyPage() {
  const jsonLd = [
    createWebPageJsonLd({ title: 'Faculty', description: seo.description, path: '/faculty' }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Faculty', path: '/faculty' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
        <FacultyHero />
        <FacultyProfile />
        <FacultyExpertiseSection />
        <TeachingPhilosophy />
        <GuestFaculty />
        <SpeakingSection />
        <FacultyClosing />

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
