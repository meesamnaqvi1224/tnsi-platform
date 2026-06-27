import type { Metadata } from 'next';
import {
  CapacityJourney,
  ChapterMarker,
  Container,
  PageQuote,
  Section,
  Stack,
  Text,
  TypographicMoment,
} from '@tnsi/ui';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';

export const metadata: Metadata = {
  title: '[Design Exploration] The TNSI Design Language',
  robots: { index: false },
};

export default function DesignLanguagePage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* ── CHAPTER I: THE CAPACITY JOURNEY ── */}
        {/*
         * ChapterMarker in natural editorial context.
         * The rule and label anchor the section to the page's left edge
         * while the heading reads independently — like a broadsheet section break.
         */}
        <Section spacing="xl" className="border-border border-t" aria-labelledby="dl-ch1-heading">
          <Container size="xl">
            <Stack gap="2xl">
              <ChapterMarker index="I" as="h1" size="xl" title="The Capacity Journey" />

              <Stack gap="lg" className="max-w-2xl">
                <Text tone="muted" className="max-w-prose">
                  Every person who arrives at the Institute is somewhere on this arc. The journey
                  does not begin at Understand — it begins at Survival, which is where most
                  high-achieving adults have been operating without knowing it.
                </Text>
                <Text tone="muted" className="max-w-prose">
                  The Capacity Journey is not a metric. It is a map. It names where you are without
                  judgment, so the work of moving forward can begin.
                </Text>
              </Stack>

              {/*
               * CapacityJourney — passive state.
               * No stage highlighted. The full arc is shown at equal visual weight.
               * Use this when introducing the concept for the first time.
               */}
              <Stack gap="sm">
                <Text size="xs" tone="muted" className="tracking-widest uppercase">
                  The full arc
                </Text>
                <CapacityJourney />
              </Stack>

              {/*
               * CapacityJourney — active state.
               * 'Understand' is the entry point for most Institute participants.
               * One stage emphasised; the rest recede without disappearing.
               */}
              <Stack gap="sm">
                <Text size="xs" tone="muted" className="tracking-widest uppercase">
                  With current stage indicated
                </Text>
                <CapacityJourney current="Understand" />
              </Stack>
            </Stack>
          </Container>
        </Section>

        {/* ── TYPOGRAPHIC MOMENT (light, left) ── */}
        {/*
         * One sentence. One viewport. Left-aligned — the reader faces it
         * directly, as though it were spoken to them personally.
         * No pull-quote marks — the scale is the emphasis.
         */}
        <TypographicMoment variant="light" align="left">
          The nervous system doesn&apos;t ask for much.
          <br />
          It asks to be heard.
        </TypographicMoment>

        {/* ── CHAPTER II: THE FOUNDATION ── */}
        {/*
         * ChapterMarker used within a section — not only as a page opener.
         * The border-t continues the ruled rhythm established in Chapter I.
         */}
        <Section spacing="xl" className="border-border border-t" aria-labelledby="dl-ch2-heading">
          <Container size="xl">
            <Stack gap="2xl">
              <ChapterMarker index="II" as="h2" size="xl" title="The Foundation" />

              <div className="grid grid-cols-1 gap-(--space-3xl) lg:grid-cols-[1fr_2fr]">
                <div />
                <Stack gap="lg">
                  <Text tone="muted" className="max-w-prose">
                    Before any technique, before any framework, before any insight — the nervous
                    system needs to experience the thing the body has been looking for since before
                    language existed: safety. Not the idea of it. The felt sense of it.
                  </Text>
                  <Text tone="muted" className="max-w-prose">
                    That is where the Institute&apos;s work begins. Not with what to think, but with
                    what the body already knows.
                  </Text>
                </Stack>
              </div>

              {/*
               * CapacityJourney embedded mid-section — showing a later stage.
               * The same component; different emphasis; entirely different meaning.
               */}
              <Stack gap="sm">
                <Text size="xs" tone="muted" className="tracking-widest uppercase">
                  Later in the journey
                </Text>
                <CapacityJourney current="Rewire" />
              </Stack>

              {/*
               * PageQuote — the colophon of the section.
               * Small, italic, centred. Rewards the reader who is still present.
               * It does not summarise what came before. It deepens it.
               */}
              <PageQuote
                quote="The body has always known what it needed. We are simply learning to listen."
                author="Caroline Reed — Founder &amp; Director"
              />
            </Stack>
          </Container>
        </Section>

        {/* ── TYPOGRAPHIC MOMENT (dark, centered) ── */}
        {/*
         * Dark variant — the Deep Slate background transforms the reading
         * experience. The same sentence would feel different on white.
         * Centered alignment shifts from directional to contemplative.
         * Use this for the most essential, distilled statements.
         */}
        <TypographicMoment variant="dark" align="center">
          You don&apos;t need to think your way
          <br />
          out of a physiological state.
        </TypographicMoment>

        {/* ── CLOSING EDITORIAL NOTE ── */}
        {/*
         * Demonstrates PageQuote in its most natural position:
         * between a dramatic section and the footer. A breath before leaving.
         */}
        <Section spacing="md" className="border-border border-t">
          <Container size="xl">
            <PageQuote
              quote="Regulation is not the absence of feeling. It is the capacity to feel — and remain present."
              author="Caroline Reed — Founder &amp; Director"
            />
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
