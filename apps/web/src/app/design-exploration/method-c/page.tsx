import type { Metadata } from 'next';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ConceptCHero } from '@/components/method-concepts/concept-c/hero';
import { ConceptCSectionOne } from '@/components/method-concepts/concept-c/section-one';
import { ConceptCSectionTwo } from '@/components/method-concepts/concept-c/section-two';

export const metadata: Metadata = {
  title: '[Design Exploration] Method — Concept C: Magazine Immersive',
  robots: { index: false },
};

export default function MethodConceptCPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <ConceptCHero />
        <ConceptCSectionOne />
        <ConceptCSectionTwo />
      </main>
      <SiteFooter />
    </>
  );
}
