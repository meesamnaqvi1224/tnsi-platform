import { CtaBand } from '@/components/home/cta-band';
import { FrameworkSection } from '@/components/home/framework-section';
import { Hero } from '@/components/home/hero';
import { MethodPanel } from '@/components/home/method-panel';
import { ProgramsSection } from '@/components/home/programs-section';
import { TrustBar } from '@/components/home/trust-bar';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { JsonLd } from '@/components/seo/json-ld';
import { createWebPageJsonLd } from '@/lib/seo';

const HOME_TITLE = 'The Nervous System Institute';
const HOME_DESCRIPTION =
  'Evidence-informed education for ambitious women, leaders and practitioners who want sustainable success without sacrificing their wellbeing.';

export default function Home() {
  const jsonLd = createWebPageJsonLd({
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    path: '/',
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
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
