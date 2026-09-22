import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer, ErrorNotice, ThemedText } from '@/components';
import { SomaticImageBlock } from '@/components/somatic-cards/SomaticImageBlock';
import { SomaticCardsSkeleton } from '@/components/somatic-cards/SomaticCardsSkeleton';
import { PracticeStepsList } from '@/components/somatic-cards/PracticeStepsList';
import { WhatToNoticeList } from '@/components/somatic-cards/WhatToNoticeList';
import { SupportingImagesGallery } from '@/components/somatic-cards/SupportingImagesGallery';
import { DemonstrationSequenceGallery } from '@/components/somatic-cards/DemonstrationSequenceGallery';
import { useSomaticCardDetail } from '@/hooks/useSomaticCardDetail';
import { colors, spacing } from '@/theme';
import type { SomaticCardDetail } from '@/api/types';

function Section({ heading, children }: PropsWithChildren<{ heading: string }>) {
  return (
    <View style={styles.section}>
      <ThemedText variant="label" color={colors.bronze} style={styles.sectionHeading}>
        {heading.toUpperCase()}
      </ThemedText>
      {children}
    </View>
  );
}

/**
 * The native Somatic Card reading experience. Field order follows the
 * milestone's required editorial hierarchy exactly: Series context, Card
 * number, Card title, Invitation, Purpose, Description, Orientation,
 * Practice (steps + demonstration sequence), What to Notice, Supporting
 * Images, Gentle Note, Anchor. Every section renders only when its
 * content exists - nothing fabricated, nothing shown as an empty shell.
 * Wording is rendered exactly as the API returns it.
 *
 * The finished 9:16 artwork is prominent near the top, but it is never
 * the sole representation of the Card - every structured field below it
 * is real, independently readable native text.
 */
export default function SomaticCardDetailScreen() {
  const params = useLocalSearchParams<{ cardSlug: string }>();
  const cardSlug = Array.isArray(params.cardSlug) ? params.cardSlug[0] : params.cardSlug;
  const { state, reload } = useSomaticCardDetail(cardSlug ?? '');
  const router = useRouter();

  if (state.status === 'loading') {
    return (
      <ScreenContainer scroll>
        <SomaticCardsSkeleton />
      </ScreenContainer>
    );
  }

  if (state.status === 'not-found') {
    return (
      <ScreenContainer>
        <ThemedText variant="heading">This card isn&apos;t available.</ThemedText>
        <ThemedText variant="body" color={colors.charcoal} style={styles.notFoundBody}>
          It may have been removed or is no longer published.
        </ThemedText>
      </ScreenContainer>
    );
  }

  if (state.status === 'error') {
    return (
      <ScreenContainer>
        <ErrorNotice message={state.message} onRetry={reload} />
      </ScreenContainer>
    );
  }

  const { card } = state;
  const title = card.title.trim();

  return (
    <ScreenContainer scroll>
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/practices/somatic-cards/[seriesSlug]',
            params: { seriesSlug: card.series.slug },
          })
        }
        accessibilityRole="link"
        accessibilityLabel={`Back to ${card.series.title}`}
        style={styles.seriesLink}
      >
        <ThemedText variant="label" color={colors.bronze}>
          ← {card.series.title}
        </ThemedText>
      </Pressable>

      <ThemedText variant="label" color={colors.bronze} style={styles.cardNumber}>
        CARD {card.cardNumber}
      </ThemedText>
      <ThemedText variant="display" style={styles.title}>
        {title}
      </ThemedText>

      {card.cardArtwork ? (
        <SomaticImageBlock
          image={card.cardArtwork}
          fallbackLabel={title}
          aspectRatio={9 / 16}
          style={styles.artwork}
        />
      ) : null}

      {card.heroImage ? (
        <SomaticImageBlock
          image={card.heroImage}
          fallbackLabel={title}
          aspectRatio={16 / 9}
          style={styles.heroImage}
        />
      ) : null}

      {card.invitation ? (
        <Section heading="Invitation">
          <ThemedText variant="body">{card.invitation}</ThemedText>
        </Section>
      ) : null}

      {card.purpose ? (
        <Section heading="Purpose">
          <ThemedText variant="body">{card.purpose}</ThemedText>
        </Section>
      ) : null}

      {card.description ? (
        <Section heading="Description">
          <ThemedText variant="body" color={colors.charcoal}>
            {card.description}
          </ThemedText>
        </Section>
      ) : null}

      {card.orientation ? (
        <Section heading="Orientation">
          <ThemedText variant="caption" color={colors.charcoal}>
            {card.orientation}
          </ThemedText>
        </Section>
      ) : null}

      {hasPracticeContent(card) ? (
        <Section heading="Practice">
          <PracticeStepsList steps={card.practiceSteps} />
          <DemonstrationSequenceGallery frames={card.demonstrationSequence} cardTitle={title} />
        </Section>
      ) : null}

      {card.whatToNotice.length > 0 ? (
        <Section heading="What to Notice">
          <WhatToNoticeList items={card.whatToNotice} />
        </Section>
      ) : null}

      {card.supportingImages.length > 0 ? (
        <Section heading="Supporting Images">
          <SupportingImagesGallery images={card.supportingImages} cardTitle={title} />
        </Section>
      ) : null}

      {card.gentleNote ? (
        <Section heading="Gentle Note">
          <ThemedText variant="body" style={styles.italic}>
            {card.gentleNote}
          </ThemedText>
        </Section>
      ) : null}

      {card.anchor ? (
        <Section heading="Anchor">
          <ThemedText variant="body" style={styles.anchor}>
            {card.anchor}
          </ThemedText>
        </Section>
      ) : null}
    </ScreenContainer>
  );
}

function hasPracticeContent(card: SomaticCardDetail): boolean {
  return card.practiceSteps.length > 0 || card.demonstrationSequence.length > 0;
}

const styles = StyleSheet.create({
  notFoundBody: {
    marginTop: spacing.sm,
  },
  seriesLink: {
    marginBottom: spacing.lg,
  },
  cardNumber: {
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: {
    marginBottom: spacing.lg,
  },
  artwork: {
    maxWidth: 320,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  heroImage: {
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    marginBottom: spacing.sm,
  },
  italic: {
    fontStyle: 'italic',
  },
  anchor: {
    fontWeight: '600',
  },
});
