import { CtaBand } from '@/components/home/cta-band';
import { FrameworkSection } from '@/components/home/framework-section';
import { Hero } from '@/components/home/hero';
import { MethodPanel } from '@/components/home/method-panel';
import { ProgramsSection } from '@/components/home/programs-section';
import { TrustBar } from '@/components/home/trust-bar';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <TrustBar />
        <FrameworkSection />
        <MethodPanel />
        <ProgramsSection />
        <CtaBand />
      </main>
      <SiteFooter />
    </>
  );
}
