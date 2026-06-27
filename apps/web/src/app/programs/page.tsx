import type { Metadata } from 'next';
import { Container, PageQuote, Section, TypographicMoment } from '@tnsi/ui';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ProgramsCards } from '@/components/programs/programs-cards';
import { ProgramsComparison } from '@/components/programs/programs-comparison';
import { ProgramsCta } from '@/components/programs/programs-cta';
import { ProgramsFaq } from '@/components/programs/programs-faq';
import { ProgramsFeatured } from '@/components/programs/programs-featured';
import { ProgramsHero } from '@/components/programs/programs-hero';
import { ProgramsJourney } from '@/components/programs/programs-journey';
import { ProgramsWhy } from '@/components/programs/programs-why';

export const metadata: Metadata = {
  title: 'Programs — The Nervous System Institute',
  description:
    'Three evidence-informed programs designed to meet you where you are: Life Beyond Trauma, Practitioner Certification and Executive Advisory. Find the right pathway for your journey.',
  openGraph: {
    title: 'Programs — The Nervous System Institute',
    description:
      'Every transformation begins with the right pathway. Explore our programs and find where your journey begins.',
  },
};

export default function ProgramsPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <ProgramsHero />

        <ProgramsWhy />

        <ProgramsCards />

        <ProgramsComparison />

        {/* One breath between the analytical comparison and the featured program */}
        <TypographicMoment variant="dark" align="center">
          Understanding your nervous system
          <br />
          is not the destination.
          <br />
          It is the beginning.
        </TypographicMoment>

        <ProgramsFeatured />

        <ProgramsJourney />

        <ProgramsFaq />

        <Section spacing="md" className="border-border border-t">
          <Container size="xl">
            <PageQuote
              quote="You don't have to have it all figured out to begin. You just have to be ready to understand."
              author="Caroline Reed — Founder &amp; Director"
            />
          </Container>
        </Section>

        <ProgramsCta />
      </main>
      <SiteFooter />
    </>
  );
}
