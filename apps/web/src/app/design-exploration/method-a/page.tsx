import type { Metadata } from 'next';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ConceptAHero } from '@/components/method-concepts/concept-a/hero';
import { ConceptASectionOne } from '@/components/method-concepts/concept-a/section-one';
import { ConceptASectionTwo } from '@/components/method-concepts/concept-a/section-two';

export const metadata: Metadata = {
  title: '[Design Exploration] Method — Concept A: Split-Screen Editorial',
  robots: { index: false },
};

export default function MethodConceptAPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <ConceptAHero />
        <ConceptASectionOne />
        <ConceptASectionTwo />
      </main>
      <SiteFooter />
    </>
  );
}
