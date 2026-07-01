import type { Metadata } from 'next';
import { Container, PageQuote, Section } from '@tnsi/ui';
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

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  openGraph: {
    title: seo.title,
    description: seo.description,
  },
};

export default function FacultyPage() {
  return (
    <>
      <SiteHeader />
      <main>
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
