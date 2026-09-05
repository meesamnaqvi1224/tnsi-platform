import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { Card, PrimaryButton, ScreenContainer, ThemedText } from '@/components';
import { useApiClient } from '@/hooks/useApiClient';
import { ApiRequestError } from '@/api/types';
import type { MeResponse } from '@/api/types';
import { colors, spacing } from '@/theme';

type LoadState =
  | { status: 'loading' }
  | { status: 'success'; me: MeResponse }
  | { status: 'error'; message: string };

/**
 * Phase 1 proof screen: fetches GET /api/v1/me through the real
 * Clerk-Expo -> bearer JWT -> Next.js API -> Postgres chain and renders
 * only what the API actually returns - nothing fabricated.
 */
export default function HomeScreen() {
  const { user } = useUser();
  const api = useApiClient();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const loadMe = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const me = await api.get<MeResponse>('/api/v1/me');
      setState({ status: 'success', me });
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? `${err.code}: ${err.message}`
          : 'Unable to reach the TNSI API.';
      setState({ status: 'error', message });
    }
  }, [api]);

  useEffect(() => {
    // Standard fetch-on-mount: loadMe sets `loading` synchronously before
    // its first `await`, which the lint rule below flags on principle, but
    // there's no external subscription to model this as instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMe();
  }, [loadMe]);

  return (
    <ScreenContainer scroll>
      <ThemedText variant="display">
        {user?.firstName ? `Welcome, ${user.firstName}` : 'Welcome'}
      </ThemedText>
      <ThemedText variant="body" color={colors.charcoal} style={styles.subtitle}>
        This screen proves the authenticated API connection end-to-end.
      </ThemedText>

      <Card style={styles.card}>
        <ThemedText variant="label" color={colors.bronze} style={styles.label}>
          GET /api/v1/me
        </ThemedText>

        {state.status === 'loading' && <ThemedText variant="body">Loading...</ThemedText>}

        {state.status === 'error' && (
          <>
            <ThemedText variant="body" color={colors.error}>
              {state.message}
            </ThemedText>
            <PrimaryButton
              label="Retry"
              variant="secondary"
              onPress={loadMe}
              style={styles.retryButton}
            />
          </>
        )}

        {state.status === 'success' && (
          <View>
            <Field label="Email" value={state.me.email} />
            <Field label="Full name" value={state.me.fullName ?? '—'} />
            <Field label="User ID" value={state.me.id} />
            <Field label="Clerk User ID" value={state.me.clerkUserId} />
          </View>
        )}
      </Card>
    </ScreenContainer>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <ThemedText variant="caption" color={colors.charcoal}>
        {label}
      </ThemedText>
      <ThemedText variant="body">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.lg,
  },
  label: {
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  field: {
    marginBottom: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.md,
  },
});
