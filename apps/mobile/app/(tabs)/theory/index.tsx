import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer, ThemedText } from '@/components';
import { PageTitle } from '@/components/PageTitle';
import { SectionHeading } from '@/components/SectionHeading';
import { home, homeCardStyle } from '@/components/home/homeTheme';
import { humanExpansionTheory } from '@/content/human-expansion-theory';
import { spacing } from '@/theme';

/**
 * Human Expansion Theory: the framework in Caroline's approved words, then the five Developmental
 * Conditions, each opening its own page. Plain reading: opening a condition records nothing and
 * unlocks nothing - the conditions are not levels.
 */
export default function TheoryScreen() {
  const router = useRouter();
  const { title, tagline, intro, centralProposition, conditions } = humanExpansionTheory;

  return (
    <ScreenContainer scroll underHeader inTabs background={home.page}>
      <PageTitle title={title} subtitle={tagline} />

      {intro.map((paragraph) => (
        <ThemedText key={paragraph} variant="body" color={home.ink} style={styles.paragraph}>
          {paragraph}
        </ThemedText>
      ))}

      <View style={styles.proposition}>
        <ThemedText variant="label" color={home.bronze} style={styles.eyebrow}>
          {centralProposition.heading}
        </ThemedText>
        <ThemedText variant="heading" color={home.navy} style={styles.statement}>
          {centralProposition.statement}
        </ThemedText>
        {centralProposition.paragraphs.map((paragraph) => (
          <ThemedText key={paragraph} variant="body" color={home.ink} style={styles.paragraph}>
            {paragraph}
          </ThemedText>
        ))}
      </View>

      <SectionHeading>{conditions.heading}</SectionHeading>
      <ThemedText variant="body" color={home.ink} style={styles.paragraph}>
        {conditions.intro}
      </ThemedText>

      {conditions.items.map((item) => (
        <Pressable
          key={item.title}
          onPress={() =>
            router.push({ pathname: '/theory/[condition]', params: { condition: item.title } })
          }
          accessibilityRole="button"
          accessibilityLabel={`${item.title}. ${item.description}`}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.cardText}>
            <ThemedText variant="heading" color={home.navy}>
              {item.title}
            </ThemedText>
            <ThemedText variant="body" color={home.ink} style={styles.cardBody}>
              {item.description}
            </ThemedText>
          </View>
          <View style={styles.chevron}>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </View>
        </Pressable>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  paragraph: { marginBottom: spacing.md },
  proposition: {
    ...homeCardStyle,
    backgroundColor: home.bronzeTint,
    padding: spacing.lg,
    marginVertical: spacing.lg,
  },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: spacing.sm },
  statement: { marginBottom: spacing.md },
  card: {
    ...homeCardStyle,
    backgroundColor: home.page,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  pressed: { opacity: 0.85 },
  cardText: { flex: 1 },
  cardBody: { marginTop: spacing.xs },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: home.bronze,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
