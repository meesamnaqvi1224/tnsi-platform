import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useApiClient } from '@/hooks/useApiClient';
import { colors, radius, spacing } from '@/theme';
import type { SavePracticeResult } from '@/api/types';

interface SaveToggleButtonProps {
  practiceId: string;
  initialSaved: boolean;
  style?: ViewStyle;
}

/**
 * A personal bookmark toggle - "Save" / "Saved", never an icon-only
 * control (mirrors the web SaveToggleButton's own reasoning). Deliberately
 * optimistic (flips immediately, reverts on failure) unlike
 * usePracticeDetail's submitCompletion/submitReflection elsewhere in this
 * app - saving is trivially reversible with no data-loss consequence, so
 * instant feedback is worth the small risk of a rare revert.
 */
export function SaveToggleButton({ practiceId, initialSaved, style }: SaveToggleButtonProps) {
  const api = useApiClient();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    const next = !saved;
    setSaved(next);
    setPending(true);

    try {
      if (next) {
        await api.post<SavePracticeResult>(`/api/v1/practices/${practiceId}/save`);
      } else {
        await api.delete<SavePracticeResult>(`/api/v1/practices/${practiceId}/save`);
      }
    } catch {
      setSaved(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <Pressable
      onPress={() => void toggle()}
      disabled={pending}
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove practice from saved' : 'Save practice'}
      accessibilityState={{ disabled: pending, selected: saved }}
      style={({ pressed }) => [
        styles.base,
        saved ? styles.saved : styles.notSaved,
        pressed && !pending && styles.pressed,
        pending && styles.disabled,
        style,
      ]}
    >
      {pending ? (
        <ActivityIndicator size="small" color={saved ? colors.cream : colors.navy} />
      ) : (
        <ThemedText variant="label" color={saved ? colors.cream : colors.navy}>
          {saved ? 'Saved' : 'Save'}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 32,
    minWidth: 64,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  notSaved: {
    backgroundColor: colors.cream,
    borderColor: colors.navy,
  },
  saved: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.7,
  },
});
