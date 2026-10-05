import { Container, Text } from '@tnsi/ui';
import { MethodChapterHeading } from '@/components/method/method-chapter-heading';
import { MethodImageSection } from '@/components/method/method-image-section';
import { DrawLine } from '@/components/utility/draw-line';
import { FadeIn } from '@/components/utility/fade-in';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';

const { protectionParticipation } = humanExpansionTheoryContent;

const termTitle =
  'font-heading text-foreground text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] font-semibold tracking-tight';
const termBody = 'text-foreground text-[1.0625rem] leading-[1.75] sm:text-lg';

/**
 * Protection and Participation — the two orientations given equal, large
 * typographic presence and joined by a single hairline that draws across
 * both. They arrive in order: Protection, Participation, then the closing
 * statement.
 */
export function MethodProtectionParticipation() {
  return (
    <MethodImageSection
      src="/images/programs/overview-hero.webp"
      scrim="bg-black/[0.78]"
      aria-label={protectionParticipation.heading}
    >
      <Container size="xl">
        <div className="grid grid-cols-1 gap-(--space-xl) lg:grid-cols-2 lg:gap-(--space-4xl)">
          <FadeIn>
            <MethodChapterHeading title={protectionParticipation.heading} />
          </FadeIn>
          <FadeIn delayMs={200}>
            <Text className="text-foreground max-w-[44ch] text-[1.0625rem] leading-[1.75] sm:text-lg lg:pt-(--space-lg)">
              {protectionParticipation.intro}
            </Text>
          </FadeIn>
        </div>

        <div className="pt-(--space-3xl) lg:pt-(--space-4xl)">
          <DrawLine />
          <div className="grid grid-cols-1 gap-(--space-2xl) pt-(--space-xl) lg:grid-cols-2 lg:gap-(--space-4xl)">
            <FadeIn>
              <p className={termTitle}>{protectionParticipation.protection.title}</p>
              <Text className={`${termBody} mt-(--space-md) max-w-[40ch]`}>
                {protectionParticipation.protection.description}
              </Text>
            </FadeIn>
            <FadeIn delayMs={250}>
              <p className={termTitle}>{protectionParticipation.participation.title}</p>
              <Text className={`${termBody} mt-(--space-md) max-w-[40ch]`}>
                {protectionParticipation.participation.description}
              </Text>
            </FadeIn>
          </div>
        </div>

        <FadeIn delayMs={450} className="pt-(--space-3xl) lg:pt-(--space-4xl)">
          <Text className="text-foreground font-heading max-w-[34ch] text-[clamp(1.5rem,2.6vw,2.25rem)] leading-[1.25] font-medium tracking-tight text-balance">
            {protectionParticipation.closing}
          </Text>
        </FadeIn>
      </Container>
    </MethodImageSection>
  );
}
