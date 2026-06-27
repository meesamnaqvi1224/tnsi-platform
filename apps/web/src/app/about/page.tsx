import type { Metadata } from 'next';
import { CtaBand } from '@/components/home/cta-band';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { AboutHero } from '@/components/about/about-hero';
import { FounderSection } from '@/components/about/founder-section';
import { MissionSection } from '@/components/about/mission-section';
import { ValuesSection } from '@/components/about/values-section';

export const metadata: Metadata = {
  title: 'About — The Nervous System Institute',
  description:
    'Learn about The Nervous System Institute, its founder Caroline Reed, and the evidence-informed approach behind fifteen years of clinical research.',
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <AboutHero />
        <MissionSection />
        <FounderSection />
        <ValuesSection />
        <CtaBand />
      </main>
      <SiteFooter />
    </>
  );
}
