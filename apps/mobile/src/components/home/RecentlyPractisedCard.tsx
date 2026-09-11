import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/ThemedText';
import { PracticeThumbnail } from '@/components/practices/PracticeThumbnail';
import { colors, spacing } from '@/theme';
import type { Practice } from '@/api/types';

interface RecentlyPractisedCardProps {
  /** Already-completed practices, most recently completed first - derived
   * by the caller from the same `/api/v1/today` response Home already
   * fetches (see (tabs)/index.tsx), same data My Learning's "Recently
   * Completed" section uses, just capped to 2 entries here. No new fetch. */
  practices: Practice[];
}

/** "2026-06-12T09:00:00.000Z" -> "12 Jun 2026". Mirrors my-learning.tsx's own local formatter. */
function formatCompletedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function RecentlyPractisedCard({ practices }: RecentlyPractisedCardProps) {
  const router = useRouter();

  if (practices.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.duration(450).delay(120)} style={styles.section}>
      <View style={styles.headerRow}>
        <ThemedText variant="heading" style={styles.sectionTitle}>
          Recently practised
        </ThemedText>
        <Pressable
          onPress={() => router.push('/my-learning')}
          accessibilityRole="link"
          accessibilityLabel="View all recently practised"
        >
          <ThemedText variant="label" color={colors.bronze}>
            View All →
          </ThemedText>
        </Pressable>
      </View>

      <Card style={styles.card}>
        {practices.map((practice, i) => {
          const completedAt = practice.progress?.completedAt;
          return (
            <Pressable
              key={practice.id}
              onPress={() =>
                router.push({ pathname: '/practices/[id]', params: { id: practice.id } })
              }
              accessibilityRole="button"
              accessibilityLabel={`${practice.title.trim()}${completedAt ? `, completed ${formatCompletedDate(completedAt)}` : ''}`}
              style={({ pressed }) => [
                styles.row,
                i > 0 && styles.rowDivider,
                pressed && styles.pressed,
              ]}
            >
              <PracticeThumbnail
                thumbnailUrl={practice.thumbnailUrl}
                contentType={practice.contentType}
                height={48}
                style={styles.thumb}
              />
              <View style={styles.textColumn}>
                <ThemedText variant="body">{practice.title.trim()}</ThemedText>
                {completedAt ? (
                  <ThemedText variant="caption" color={colors.charcoal}>
                    Completed {formatCompletedDate(completedAt)}
                  </ThemedText>
                ) : null}
              </View>
              <ThemedText variant="label" color={colors.bronze}>
                ›
              </ThemedText>
            </Pressable>
          );
        })}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    flex: 1,
  },
  card: {
    padding: 0,
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  thumb: {
    width: 48,
  },
  textColumn: {
    flex: 1,
  },
});
