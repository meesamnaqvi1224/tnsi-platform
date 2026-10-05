import { Container, EditorialFigure, Section, Text } from '@tnsi/ui';
import { DevelopmentalConditions } from '@/components/method/developmental-conditions';
import { MethodChapterHeading } from '@/components/method/method-chapter-heading';
import { PolyvagalHierarchyFigure } from '@/components/method/polyvagal-hierarchy-figure';
import { FadeIn } from '@/components/utility/fade-in';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';

const { developmentalConditions, polyvagalFigure } = humanExpansionTheoryContent;

/**
 * The Five Developmental Conditions™ — the page's most interactive chapter.
 * Desktop: the heading and introduction stay in place (sticky) while the
 * conditions progress beside them. Mobile: a single vertical progression
 * with the same active-state behaviour (no sticky column). The polyvagal
 * figure that already belongs to this chapter follows at full width.
 */
export function MethodJourney() {
  return (
    <Section
      data-chapter
      className="border-border border-t py-(--space-4xl) sm:py-(--space-5xl)"
      aria-label={developmentalConditions.heading}
    >
      <Container size="xl">
        <div className="grid grid-cols-1 gap-(--space-2xl) lg:grid-cols-[5fr_7fr] lg:gap-(--space-4xl)">
          <FadeIn className="lg:sticky lg:top-32 lg:self-start">
            <MethodChapterHeading title={developmentalConditions.heading} />
            <Text className="text-foreground/75 mt-(--space-lg) max-w-[44ch] text-[1.0625rem] leading-[1.75] sm:text-lg">
              {developmentalConditions.intro}
            </Text>
          </FadeIn>

          <DevelopmentalConditions items={developmentalConditions.items} />
        </div>

        <FadeIn className="pt-(--space-4xl)">
          <EditorialFigure
            number={1}
            caption={polyvagalFigure.caption}
            source={polyvagalFigure.source}
          >
            <PolyvagalHierarchyFigure />
          </EditorialFigure>
        </FadeIn>
      </Container>
    </Section>
  );
}
