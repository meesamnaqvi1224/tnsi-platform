import type { Metadata } from 'next';
import { Container, PageQuote, Section, TypographicMoment } from '@tnsi/ui';
import { CtaBand } from '@/components/home/cta-band';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { MethodCredentials } from '@/components/method/method-credentials';
import { MethodFoundation } from '@/components/method/method-foundation';
import { MethodHero } from '@/components/method/method-hero';
import { MethodJourney } from '@/components/method/method-journey';

export const metadata: Metadata = {
  title: 'The Method — The Nervous System Institute',
  description:
    'Life Beyond Trauma: an evidence-informed methodology built on fifteen years of clinical research into the nervous system, polyvagal theory, and sustainable high performance.',
  openGraph: {
    title: 'The Method — The Nervous System Institute',
    description:
      'Not a technique for managing symptoms. A different physiological foundation — built at the level where patterns actually live.',
  },
};

export default function MethodPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <MethodHero />

        {/* One sentence. One viewport. The thesis of everything that follows. */}
        <TypographicMoment variant="light" align="left">
          Healing doesn&apos;t begin when you think differently.
          <br />
          It begins when your nervous system experiences safety.
        </TypographicMoment>

        <MethodFoundation />

        <MethodJourney />

        <MethodCredentials />

        <Section spacing="md" className="border-border border-t">
          <Container size="xl">
            <PageQuote
              quote="The body has always known what it needed. We are simply learning to listen."
              author="Caroline Reed — Founder &amp; Director"
            />
          </Container>
        </Section>

        <CtaBand />
      </main>
      <SiteFooter />
    </>
  );
}
