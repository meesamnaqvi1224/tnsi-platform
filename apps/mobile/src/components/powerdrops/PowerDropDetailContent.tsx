import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { PowerDropArtwork } from './PowerDropArtwork';
import { colors, spacing } from '@/theme';
import type { PowerDrop } from '@/api/types';
import { home } from '@/components/home/homeTheme';

function Section({ heading, children }: PropsWithChildren<{ heading: string }>) {
  return (
    <View style={styles.section}>
      <ThemedText variant="label" color={home.bronze} style={styles.sectionHeading}>
        {heading.toUpperCase()}
      </ThemedText>
      {children}
    </View>
  );
}

/**
 * The PowerDrop™ reading experience, in the Core Series' editorial order:
 * the standalone visual, title, Purpose, Description, Practice, Anchor
 * Statement. The artwork is its own element above the text — never behind
 * it, never carrying it — and every word of the practice is native text, so
 * it stays readable, selectable and screen-reader accessible whatever the
 * image shows. A section renders only when its content exists; nothing is
 * fabricated (the PowerDrop content model has no "What to Notice" or
 * "Gentle Note" fields, so those sections do not appear).
 */
export function PowerDropDetailContent({ powerDrop }: { powerDrop: PowerDrop }) {
  const title = powerDrop.title.trim();
  const eyebrow = powerDrop.category ?? powerDrop.focus;
  const purpose = powerDrop.focus.trim();
  const meta = [powerDrop.duration].filter(Boolean).join(' · ');

  return (
    <View style={styles.column}>
      <PowerDropArtwork
        title={title}
        cardImage={powerDrop.cardImage}
        variant="detail"
        style={styles.artwork}
      />

      <ThemedText variant="label" color={home.bronze} style={styles.eyebrow}>
        {eyebrow}
      </ThemedText>
      <ThemedText
        variant="display"
        style={meta ? styles.title : { ...styles.title, marginBottom: spacing.lg }}
      >
        {title}
      </ThemedText>
      {meta ? (
        <ThemedText variant="caption" color={home.ink} style={styles.meta}>
          {meta}
        </ThemedText>
      ) : null}

      {purpose ? (
        <Section heading="Purpose">
          <ThemedText variant="body">{purpose}</ThemedText>
        </Section>
      ) : null}

      {powerDrop.description ? (
        <Section heading="Description">
          <ThemedText variant="body" color={home.ink}>
            {powerDrop.description}
          </ThemedText>
        </Section>
      ) : null}

      {powerDrop.instructions.length > 0 ? (
        <Section heading="Practice">
          <View accessibilityRole="list">
            {powerDrop.instructions.map((step, index) => (
              <View key={`${index}-${step}`} style={styles.stepRow}>
                <ThemedText variant="body" color={home.bronze} style={styles.stepNumber}>
                  {index + 1}
                </ThemedText>
                <ThemedText variant="body" style={styles.stepText}>
                  {step}
                </ThemedText>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {powerDrop.anchorStatement ? (
        <Section heading="Anchor Statement">
          <View style={styles.anchor}>
            <ThemedText variant="heading" color={home.navy} style={styles.anchorText}>
              “{powerDrop.anchorStatement}”
            </ThemedText>
          </View>
        </Section>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // A comfortable reading measure on wide screens; full width on a phone.
  column: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  artwork: {
    marginBottom: spacing.lg,
  },
  eyebrow: {
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: {
    marginBottom: spacing.xs,
  },
  meta: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    marginBottom: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  stepNumber: {
    width: 24,
  },
  stepText: {
    flex: 1,
  },
  anchor: {
    borderLeftWidth: 3,
    borderLeftColor: colors.bronzeMuted,
    paddingLeft: spacing.md,
  },
  anchorText: {
    fontStyle: 'italic',
  },
});
