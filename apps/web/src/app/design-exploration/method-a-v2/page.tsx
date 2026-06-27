import type { Metadata } from 'next';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ConceptAV2Hero } from '@/components/method-concepts/concept-a-v2/hero';
import { ConceptAV2SectionOne } from '@/components/method-concepts/concept-a-v2/section-one';
import { ConceptAV2SectionTwo } from '@/components/method-concepts/concept-a-v2/section-two';

export const metadata: Metadata = {
  title: '[Design Exploration] Method — Concept A v2: Editorial Refined',
  robots: { index: false },
};

export default function MethodConceptAV2Page() {
  return (
    <>
      <SiteHeader />
      <main>
        <ConceptAV2Hero />
        <ConceptAV2SectionOne />
        <ConceptAV2SectionTwo />
      </main>
      <SiteFooter />
    </>
  );
}
