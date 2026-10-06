import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { MethodFinalCta } from '@/components/method/method-final-cta';
import { MethodPullQuote } from '@/components/method/method-pull-quote';
import { MethodStatement } from '@/components/method/method-statement';
import { PolyvagalHierarchyFigure } from '@/components/method/polyvagal-hierarchy-figure';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';
import { Container, EditorialFigure, Section } from '@tnsi/ui';
import { ExperienceLoader } from './ExperienceLoader';
import { HumanExpansionTheory } from './HumanExpansionTheory';

const { polyvagalFigure } = humanExpansionTheoryContent;

/**
 * The Human Expansion Theory™ page as one composition, in the order of the
 * existing page's content: the opening statement; the theory itself (title,
 * Why a New Framework?, The Central Proposition, the five conditions,
 * Protection and Participation, From Theory to Practice, An Evolving Body of
 * Work — server-rendered, progressively enhanced into the scrolling 3D scene);
 * then the polyvagal figure, the quotation, the closing call to action and the
 * footer. This is the `/method` page.
 *
 * `--he-header` is the site header's height, so the sticky stage sits beneath it.
 */
export function HumanExpansionPage({ debug = false }: { debug?: boolean }) {
  return (
    <div className="[--he-header:4rem] sm:[--he-header:5rem]">
      <SiteHeader />
      <main id="main-content">
        {/* One sentence. One pause. The thesis of everything that follows. */}
        <MethodStatement />

        {/* The page's light ground deepens into the scene's dark one. */}
        <div aria-hidden className="he-band-in" />

        <HumanExpansionTheory />
        <ExperienceLoader debug={debug} />

        {/* ...and back out again, so the hand-off to normal page flow is a gradual one. */}
        <div aria-hidden className="he-band-out" />

        <div className="bg-background text-foreground">
          <Section
            className="py-(--space-4xl) sm:py-(--space-5xl)"
            aria-label="Polyvagal hierarchy"
          >
            <Container size="xl">
              <EditorialFigure
                number={1}
                caption={polyvagalFigure.caption}
                source={polyvagalFigure.source}
              >
                <PolyvagalHierarchyFigure />
              </EditorialFigure>
            </Container>
          </Section>
          <MethodPullQuote />
          <MethodFinalCta />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
