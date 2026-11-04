import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { colors, spacing } from '@/theme';

/**
 * Where the full record lives. Completed shows one entry per practice; every individual
 * session, its reflection and the daily check-ins stay in these two existing screens.
 */
export function HistoryLinks() {
  const router = useRouter();
  const links = [
    {
      label: 'Practice History',
      note: 'Every completed session, with your reflections.',
      onPress: () => router.push('/practices/history'),
    },
    {
      label: 'My Journey',
      note: 'Sessions and daily check-ins, in order.',
      onPress: () => router.push('/practices/journey'),
    },
  ];

  return (
    <View style={styles.wrap}>
      <ThemedText variant="label" color={colors.bronze} style={styles.eyebrow}>
        THE FULL RECORD
      </ThemedText>
      {links.map((link) => (
        <Pressable
          key={link.label}
          onPress={link.onPress}
          accessibilityRole="link"
          accessibilityLabel={`${link.label}. ${link.note}`}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.text}>
            <ThemedText variant="heading">{link.label}</ThemedText>
            <ThemedText variant="caption" color={colors.charcoal}>
              {link.note}
            </ThemedText>
          </View>
          <ThemedText variant="heading" color={colors.bronze}>
            ›
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xl,
  },
  eyebrow: {
    marginBottom: spacing.xs,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
});
