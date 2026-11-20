import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { KIND_LABEL, startLabel, whyLine, type HomeSuggestionsView } from '@/lib/home-suggestions';
import { fontFamily, linkHitSlop, linkTouchTarget, spacing } from '@/theme';
import { ForThisMomentCard } from './ForThisMomentCard';
import { home, homeCardStyle } from './homeTheme';
import type { HomeSuggestion, HomeSuggestionKind, Practice } from '@/api/types';

const momentImage = require('../../../assets/images/practice-moment.jpg');

const KIND_ICON: Record<HomeSuggestionKind, keyof typeof Ionicons.glyphMap> = {
  practice: 'headset-outline',
  powerDrop: 'flash-outline',
  somaticCard: 'albums-outline',
};

/**
 * Home after today's check-in, when the server returned `suggestions`: the first item as the hero, a
 * short reason (wording approved by Caroline), one action, the link to the matching Human Expansion
 * Theory section, then at most two small rows for the rest. No recommendation logic lives here: the
 * server chose and ordered the items (apps/web/src/lib/het-suggestions.ts); this only presents them.
 * When the hero is the guided practice it reuses `todayPractice` for its artwork, length and lock.
 */
export function HomeSuggestions({
  view,
  todayPractice,
}: {
  view: HomeSuggestionsView;
  todayPractice: Practice | null;
}) {
  const router = useRouter();
  const { hero, more, moreHeading, condition } = view;
  const heroPractice =
    hero.kind === 'practice' && todayPractice?.id === hero.id ? todayPractice : null;
  const locked = heroPractice?.locked === true;

  const open = (item: HomeSuggestion) => {
    if (item.kind === 'powerDrop' && item.slug) {
      router.push({ pathname: '/practices/powerdrops/[slug]', params: { slug: item.slug } });
    } else if (item.kind === 'somaticCard' && item.slug) {
      router.push({
        pathname: '/practices/somatic-cards/card/[cardSlug]',
        params: { cardSlug: item.slug },
      });
    } else if (item.kind === 'practice') {
      router.push({ pathname: '/practices/[id]', params: { id: item.id } });
    }
  };

  return (
    <View style={styles.wrap}>
      {heroPractice ? (
        <ForThisMomentCard practice={heroPractice} hasCheckedInToday />
      ) : (
        <View style={styles.section}>
          <ThemedText variant="display" color={home.navy} style={styles.sectionTitle}>
            Your practice for today
          </ThemedText>
          <Pressable
            onPress={() => open(hero)}
            accessibilityRole="button"
            accessibilityLabel={`${hero.title.trim()}. ${KIND_LABEL[hero.kind]}. Recommended for you. Opens it.`}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <Image source={momentImage} style={styles.image} accessibilityIgnoresInvertColors />
            <View style={styles.body}>
              <ThemedText variant="label" color={home.bronze} style={styles.eyebrow}>
                Recommended for you · {KIND_LABEL[hero.kind]}
                {condition ? ` · ${condition}` : ''}
              </ThemedText>
              <ThemedText
                variant="heading"
                color={home.navy}
                style={styles.title}
                numberOfLines={2}
              >
                {hero.title.trim()}
              </ThemedText>
              {hero.description ? (
                <ThemedText variant="caption" color={home.ink} numberOfLines={3}>
                  {hero.description}
                </ThemedText>
              ) : null}
            </View>
          </Pressable>
        </View>
      )}

      <View style={styles.extras}>
        <ThemedText variant="body" color={home.ink} style={styles.why}>
          {whyLine(condition)}
        </ThemedText>
        <PrimaryButton label={startLabel(hero.kind, locked)} onPress={() => open(hero)} />
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

        {more.length > 0 ? (
          <View style={styles.moreWrap}>
            <ThemedText variant="label" color={home.ink} style={styles.moreHeading}>
              {moreHeading.toUpperCase()}
            </ThemedText>
            {more.map((item) => (
              <Pressable
                key={`${item.kind}-${item.id}`}
                onPress={() => open(item)}
                accessibilityRole="button"
                accessibilityLabel={`${KIND_LABEL[item.kind]}: ${item.title.trim()}`}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={styles.rowIcon}>
                  <Ionicons name={KIND_ICON[item.kind]} size={18} color={home.bronze} />
                </View>
                <View style={styles.rowText}>
                  <ThemedText variant="label" color={home.bronze} style={styles.rowKind}>
                    {KIND_LABEL[item.kind].toUpperCase()}
                  </ThemedText>
                  <ThemedText variant="body" color={home.navy} numberOfLines={2}>
                    {item.title.trim()}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={home.bronze} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.xl },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: fontFamily.serif,
    marginBottom: spacing.md,
  },
  card: {
    ...homeCardStyle,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: home.page,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.9 },
  image: { width: 118, height: 130 },
  body: { flex: 1, padding: spacing.md },
  eyebrow: { fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 19, lineHeight: 24, marginBottom: 4 },
  extras: { marginTop: -spacing.md },
  why: { marginBottom: spacing.md },
  link: { ...linkTouchTarget, marginTop: spacing.md, alignSelf: 'flex-start' },
  moreWrap: { marginTop: spacing.lg },
  moreHeading: { letterSpacing: 1, marginBottom: spacing.sm },
  row: {
    ...homeCardStyle,
    backgroundColor: home.cool,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: home.bronzeTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowKind: { fontSize: 10.5, letterSpacing: 0.8 },
});
