import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { conditionsOf } from '@/lib/conditions';
import { formatDuration } from '@/lib/format';
import { linkHitSlop, spacing } from '@/theme';
import { home, homeCardStyle } from './homeTheme';
import type { Practice } from '@/api/types';

/**
 * Under the primary recommendation: a short reason, the Start Practice action, a link to the matching
 * Human Expansion Theory section (only when the practice itself is tagged with a condition), and the
 * one optional alternative. No countdowns, no "next up", nothing that pushes the member on.
 *
 * The reason is deliberately plain: the recommendation is a fixed routing from the capacity answer
 * (see packages/core's recommendation mapping), so all that can be said truthfully is that.
 */
export function RecommendationExtras({
  primary,
  alternative,
}: {
  primary: Practice;
  alternative: Practice | null;
}) {
  const router = useRouter();
  const condition = conditionsOf(primary.tags)[0] ?? null;
  const open = (practice: Practice) =>
    router.push({ pathname: '/practices/[id]', params: { id: practice.id } });

  return (
    <View style={styles.wrap}>
      <ThemedText variant="body" color={home.ink} style={styles.why}>
        Chosen to match how you described your capacity today.
      </ThemedText>
      <PrimaryButton
        label={primary.locked ? 'View practice' : 'Start practice'}
        onPress={() => open(primary)}
      />
      {condition ? (
        <Pressable
          onPress={() => router.push({ pathname: '/theory/[condition]', params: { condition } })}
          accessibilityRole="link"
          accessibilityLabel={`Learn about ${condition} in Human Expansion Theory`}
          hitSlop={linkHitSlop}
          style={styles.link}
        >
          <ThemedText variant="label" color={home.bronze}>
            Learn about {condition} →
          </ThemedText>
        </Pressable>
      ) : null}
      {alternative ? (
        <Pressable
          onPress={() => open(alternative)}
          accessibilityRole="button"
          accessibilityLabel={`Another option: ${alternative.title.trim()}`}
          style={({ pressed }) => [styles.alt, pressed && styles.pressed]}
        >
          <View style={styles.altText}>
            <ThemedText variant="label" color={home.bronze} style={styles.altEyebrow}>
              Or, another option
            </ThemedText>
            <ThemedText variant="body" color={home.navy} numberOfLines={2}>
              {alternative.title.trim()}
              {alternative.durationSeconds
                ? ` · ${formatDuration(alternative.durationSeconds)}`
                : ''}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={home.bronze} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: -spacing.md, marginBottom: spacing.xl },
  why: { marginBottom: spacing.md },
  link: { marginTop: spacing.md, alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  alt: {
    ...homeCardStyle,
    backgroundColor: home.page,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  altText: { flex: 1 },
  altEyebrow: { fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 },
  pressed: { opacity: 0.85 },
});
