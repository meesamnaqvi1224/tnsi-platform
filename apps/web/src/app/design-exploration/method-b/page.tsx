import type { Metadata } from 'next';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ConceptBHero } from '@/components/method-concepts/concept-b/hero';
import { ConceptBSectionOne } from '@/components/method-concepts/concept-b/section-one';
import { ConceptBSectionTwo } from '@/components/method-concepts/concept-b/section-two';

export const metadata: Metadata = {
  title: '[Design Exploration] Method — Concept B: Minimal Storytelling',
  robots: { index: false },
};

export default function MethodConceptBPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <ConceptBHero />
        <ConceptBSectionOne />
        <ConceptBSectionTwo />
      </main>
      <SiteFooter />
    </>
  );
}
