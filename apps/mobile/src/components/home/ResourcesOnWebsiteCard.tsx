import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { openTnsiPage } from '@/lib/open-web';
import { home } from '@/components/home/homeTheme';
import { colors, radius, spacing } from '@/theme';

/** An existing approved photograph (the library), already used elsewhere on Home. */
const thumbnail = require('../../../assets/images/explore-resources.jpg');

/**
 * Articles, guides and research live on the Institute's website, not in the app: the app is a library
 * of tools and practices. This row hands off there (in the in-app browser) and nothing about
 * resources is built or fetched natively. Same compact row as the other Institute links.
 */
export function ResourcesOnWebsiteCard() {
  return (
    <Pressable
      onPress={() => void openTnsiPage('resources')}
      accessibilityRole="button"
      accessibilityLabel="Articles and resources - opens the Institute's website"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Image source={thumbnail} style={styles.thumbnail} accessibilityIgnoresInvertColors />
      <ThemedText variant="body" color={colors.charcoal} style={styles.text}>
        Articles and resources, on the Institute's website.
      </ThemedText>
      <View style={styles.arrow}>
        <ThemedText variant="label" color={colors.bronze}>
          →
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: home.border,
  },
  thumbnail: { width: 56, height: 56, borderRadius: radius.md },
  arrow: { width: 20, alignItems: 'flex-end' },
  text: { flex: 1 },
});
