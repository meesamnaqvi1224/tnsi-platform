import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { PracticeThumbnail } from './PracticeThumbnail';
import { SaveToggleButton } from './SaveToggleButton';
import { capitalize, formatDuration } from '@/lib/format';
import { inProgressPractices, percentLabel } from '@/lib/my-learning';
import { categoryLabel } from '@/lib/practice-library';
import { colors, spacing } from '@/theme';
import type { Practice } from '@/api/types';

interface PracticeCardProps {
  practice: Practice;
  /** Reports a save/unsave so the list keeps it if this card is filtered away and back. */
  onSavedChange?: (saved: boolean) => void;
}

/**
 * One library entry, in the order a member scans it: the focus it belongs to (category), the
 * title, a short description, then format · duration and, when they have started it, how far
 * they got. Only real fields: no popularity, ratings, streaks or "trending".
 *
 * The progress line uses the same rule as My Learning's In Progress view, so the two agree.
 */
export function PracticeCard({ practice, onSavedChange }: PracticeCardProps) {
  const router = useRouter();
  const title = practice.title.trim();
  const category = practice.category?.trim() ? categoryLabel(practice.category) : null;
  const meta = [capitalize(practice.contentType)];
  if (practice.durationSeconds) meta.push(formatDuration(practice.durationSeconds));
  // Decided by the server (see Practice.locked): a paid-library practice the
  // member can't open yet. Still tappable - the detail screen explains.
  const locked = practice.locked === true;
  const startedPct =
    inProgressPractices([practice]).length > 0 && practice.progress?.progressPct != null
      ? percentLabel(practice.progress.progressPct)
      : null;

  const label = [
    title,
    category,
    meta.join(', '),
    startedPct ? `${startedPct} complete` : null,
    locked ? 'members only' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    // The save toggle is a sibling of this Pressable, not nested inside it -
    // React Native's default `accessible` behavior collapses a Pressable's
    // entire subtree into one accessibility element, which would silently
    // hide a nested save button from screen readers. Positioned absolutely
    // over the thumbnail instead, so tapping it never also navigates.
    <View style={styles.wrapper}>
      <Pressable
        onPress={() => router.push({ pathname: '/practices/[id]', params: { id: practice.id } })}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Card style={styles.card}>
          <PracticeThumbnail
            thumbnailUrl={practice.thumbnailUrl}
            contentType={practice.contentType}
            height={140}
            style={styles.thumbnail}
          />
          {category || locked ? (
            <View style={styles.eyebrowRow}>
              <ThemedText variant="label" color={colors.bronze} style={styles.eyebrow}>
                {category ?? ''}
              </ThemedText>
              {locked ? (
                <ThemedText variant="label" color={colors.bronze} style={styles.eyebrow}>
                  Members
                </ThemedText>
              ) : null}
            </View>
          ) : null}
          <ThemedText variant="heading" style={styles.title}>
            {title}
          </ThemedText>
          {practice.description ? (
            <ThemedText
              variant="body"
              color={colors.charcoal}
              numberOfLines={2}
              style={styles.description}
            >
              {practice.description}
            </ThemedText>
          ) : null}
          <View style={styles.metaRow}>
            <ThemedText variant="caption" color={colors.charcoal}>
              {meta.join(' · ')}
            </ThemedText>
            {startedPct ? (
              <ThemedText variant="caption" color={colors.bronze}>
                {startedPct} complete
              </ThemedText>
            ) : null}
          </View>
        </Card>
      </Pressable>
      {locked ? null : (
        <SaveToggleButton
          practiceId={practice.id}
          initialSaved={practice.saved ?? false}
          onSavedChange={onSavedChange}
          style={styles.saveButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  pressed: {
    opacity: 0.85,
  },
  card: {
    marginBottom: spacing.lg,
  },
  thumbnail: {
    marginBottom: spacing.md,
  },
  eyebrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    marginBottom: spacing.xs,
  },
  description: {
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Inside the thumbnail (the card's padding plus a small inset), not straddling its corner.
  saveButton: {
    position: 'absolute',
    top: spacing.lg + spacing.sm,
    right: spacing.lg + spacing.sm,
  },
});
