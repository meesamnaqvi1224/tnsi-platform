import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { home, homeCardStyle } from '@/components/home/homeTheme';
import { spacing } from '@/theme';

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
      <ThemedText variant="label" color={home.bronze} style={styles.eyebrow}>
        THE FULL RECORD
      </ThemedText>
      <View style={styles.card}>
        {links.map((link, index) => (
          <Pressable
            key={link.label}
            onPress={link.onPress}
            accessibilityRole="link"
            accessibilityLabel={`${link.label}. ${link.note}`}
            style={({ pressed }) => [
              styles.row,
              index > 0 && styles.divider,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.text}>
              <ThemedText variant="heading" color={home.navy} style={styles.title}>
                {link.label}
              </ThemedText>
              <ThemedText variant="caption" color={home.ink}>
                {link.note}
              </ThemedText>
            </View>
            <View style={styles.chevron} accessibilityElementsHidden importantForAccessibility="no">
              <Ionicons name="chevron-forward" size={14} color={home.bronze} />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xl,
  },
  eyebrow: {
    marginBottom: spacing.sm,
    letterSpacing: 1.4,
  },
  card: {
    ...homeCardStyle,
    backgroundColor: home.page,
    overflow: 'hidden',
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: home.border,
  },
  pressed: {
    opacity: 0.7,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
  },
  chevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: home.bronzeTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
