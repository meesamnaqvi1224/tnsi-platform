import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { JOURNAL_CONSENT_COPY } from '@tnsi/core';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedText } from '@/components/ThemedText';
import { home, homeCardStyle } from '@/components/home/homeTheme';
import { spacing } from '@/theme';

interface ConsentNoticeProps {
  /** Records the acknowledgement; resolves whether it worked. */
  onAgree: () => Promise<boolean>;
  /** Leaves without agreeing. */
  onNotNow: () => void;
  busy: boolean;
}

/**
 * The first-use acknowledgement for My Reflections (decision Q1, 16 Nov 2026). A separate step with its
 * own unticked box - not part of any Terms - and the button stays off until it is ticked. "Not now" leaves.
 * Wording is PROPOSED (legal review pending) and lives in `@tnsi/core`.
 */
export function ConsentNotice({ onAgree, onNotNow, busy }: ConsentNoticeProps) {
  const [agreed, setAgreed] = useState(false);
  const [failed, setFailed] = useState(false);
  const copy = JOURNAL_CONSENT_COPY;

  async function agree() {
    setFailed(false);
    if (!(await onAgree())) setFailed(true);
  }

  return (
    <View style={styles.card}>
      <View accessibilityRole="header" accessible>
        <ThemedText variant="heading" color={home.navy}>
          {copy.title}
        </ThemedText>
      </View>
      <ThemedText variant="body" color={home.ink} style={styles.text}>
        {copy.intro}
      </ThemedText>
      {copy.points.map((point) => (
        <ThemedText key={point} variant="body" color={home.ink} style={styles.text}>
          {'•  '}
          {point}
        </ThemedText>
      ))}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed, disabled: busy }}
        accessibilityLabel={copy.checkboxLabel}
        disabled={busy}
        onPress={() => setAgreed((v) => !v)}
        style={styles.checkRow}
      >
        <Ionicons
          name={agreed ? 'checkbox' : 'square-outline'}
          size={26}
          color={home.navy}
          accessible={false}
        />
        <ThemedText variant="body" color={home.ink} style={styles.checkLabel}>
          {copy.checkboxLabel}
        </ThemedText>
      </Pressable>
      <PrimaryButton
        label={busy ? copy.saving : copy.agreeButton}
        onPress={() => void agree()}
        disabled={!agreed}
        loading={busy}
      />
      <PrimaryButton
        label={copy.notNowButton}
        variant="secondary"
        onPress={onNotNow}
        disabled={busy}
      />
      {failed ? (
        <View accessibilityLiveRegion="polite">
          <ThemedText variant="caption" color={home.ink}>
            {copy.failed}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...homeCardStyle, gap: spacing.md },
  text: { lineHeight: 22 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, minHeight: 48 },
  checkLabel: { flex: 1, lineHeight: 22 },
});
