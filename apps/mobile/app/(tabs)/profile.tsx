import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Card, PrimaryButton, ScreenContainer, ThemedText } from '@/components';
import { Avatar } from '@/components/profile/Avatar';
import { useEntitlements } from '@/hooks/useEntitlements';
import { usePractices } from '@/hooks/usePractices';
import { formatArticleDate } from '@/lib/format';
import { env } from '@/lib/env';
import { colors, spacing } from '@/theme';
import type { EntitlementStatus, EntitlementTier } from '@/api/types';

const TIER_LABEL: Record<EntitlementTier, string> = {
  free: 'Free Member',
  monthly: 'Monthly Member',
  annual: 'Annual Member',
  lifetime: 'Lifetime Member',
};

/** Only statuses worth calling out - 'active' is the unremarkable default and isn't shown as a separate line. */
const STATUS_NOTE: Partial<Record<EntitlementStatus, string>> = {
  past_due: 'Payment past due',
  canceled: 'Membership canceled',
  trialing: 'Trial period',
  expired: 'Membership expired',
};

function initialsFor(
  firstName: string | null,
  lastName: string | null,
  email: string | null,
): string {
  const first = firstName?.trim().charAt(0) ?? '';
  const last = lastName?.trim().charAt(0) ?? '';
  const initials = `${first}${last}`.toUpperCase();
  if (initials) return initials;
  return (email?.trim().charAt(0) ?? '?').toUpperCase();
}

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const entitlementsState = useEntitlements();
  const practicesState = usePractices();

  const completedCount = useMemo(() => {
    if (practicesState.state.status !== 'success') return null;
    const practices = practicesState.state.practices;
    if (practices.length === 0) return null;
    const completed = practices.filter((p) => p.progress?.completed).length;
    return { completed, total: practices.length };
  }, [practicesState.state]);

  function confirmSignOut() {
    if (signingOut) return;
    Alert.alert('Sign Out', 'You will be signed out of your TNSI account on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: handleSignOut },
    ]);
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      // Clears the Clerk session; RootLayout's AuthGate then redirects to
      // (auth) automatically once `isSignedIn` flips to false.
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const fullName = user?.fullName ?? null;
  const initials = initialsFor(user?.firstName ?? null, user?.lastName ?? null, email);

  return (
    <ScreenContainer scroll>
      <ThemedText variant="display" style={styles.heading}>
        Profile
      </ThemedText>

      <View style={styles.identityRow}>
        <Avatar
          imageUrl={user?.imageUrl ?? null}
          hasImage={user?.hasImage ?? false}
          initials={initials}
        />
        <View
          style={styles.identityText}
          accessible
          accessibilityLabel={[fullName, email].filter(Boolean).join(', ')}
        >
          <ThemedText variant="heading">{fullName ?? 'Member'}</ThemedText>
          {email ? (
            <ThemedText variant="body" color={colors.charcoal}>
              {email}
            </ThemedText>
          ) : null}
        </View>
      </View>

      <SectionLabel>Account</SectionLabel>
      <Card style={styles.card}>
        {entitlementsState.state.status === 'success' ? (
          <MembershipSummary entitlements={entitlementsState.state.entitlements} />
        ) : entitlementsState.state.status === 'loading' ? (
          <ThemedText variant="body" color={colors.charcoal}>
            Loading membership details…
          </ThemedText>
        ) : (
          // Entitlements are optional context, not identity - a failed
          // fetch never blocks the rest of the profile screen. A quiet
          // inline retry is enough; no full-screen error state.
          <Pressable
            onPress={entitlementsState.reload}
            accessibilityRole="button"
            accessibilityLabel="Retry loading membership details"
          >
            <ThemedText variant="body" color={colors.charcoal}>
              Membership details couldn&apos;t be loaded. Tap to retry.
            </ThemedText>
          </Pressable>
        )}

        {completedCount ? (
          <View style={styles.activityRow}>
            <ThemedText variant="caption" color={colors.charcoal}>
              {completedCount.completed} of {completedCount.total} practices completed
            </ThemedText>
          </View>
        ) : null}
      </Card>

      <SectionLabel>Support</SectionLabel>
      <Card style={styles.card}>
        <LinkRow label="Contact" path="/contact" />
        <Divider />
        <LinkRow label="Privacy Policy" path="/privacy" />
        <Divider />
        <LinkRow label="Terms of Service" path="/terms" last />
      </Card>

      <PrimaryButton
        label="Sign Out"
        variant="secondary"
        onPress={confirmSignOut}
        loading={signingOut}
        style={styles.signOut}
      />
    </ScreenContainer>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <ThemedText variant="label" color={colors.bronze} style={styles.sectionLabel}>
      {children.toUpperCase()}
    </ThemedText>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function LinkRow({ label, path, last }: { label: string; path: string; last?: boolean }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(`${env.apiBaseUrl}${path}`)}
      accessibilityRole="link"
      accessibilityLabel={`${label}, opens in browser`}
      style={[styles.linkRow, last && styles.linkRowLast]}
    >
      <ThemedText variant="body">{label}</ThemedText>
      <ThemedText variant="body" color={colors.charcoal}>
        ›
      </ThemedText>
    </Pressable>
  );
}

function MembershipSummary({ entitlements }: { entitlements: import('@/api/types').Entitlements }) {
  const statusNote = STATUS_NOTE[entitlements.status];
  const hasPrograms = entitlements.programs.length > 0;
  const hasCertifications = entitlements.certifications.length > 0;
  const showRenewal =
    entitlements.tier !== 'free' &&
    entitlements.status === 'active' &&
    entitlements.currentPeriodEnd;

  return (
    <View>
      <ThemedText variant="body">{TIER_LABEL[entitlements.tier]}</ThemedText>
      {statusNote ? (
        <ThemedText variant="caption" color={colors.error} style={styles.statusNote}>
          {statusNote}
        </ThemedText>
      ) : null}
      {showRenewal ? (
        <ThemedText variant="caption" color={colors.charcoal} style={styles.statusNote}>
          Renews {formatArticleDate(entitlements.currentPeriodEnd as string)}
        </ThemedText>
      ) : null}
      {hasPrograms ? (
        <ThemedText variant="caption" color={colors.charcoal} style={styles.statusNote}>
          Programs: {entitlements.programs.join(', ')}
        </ThemedText>
      ) : null}
      {hasCertifications ? (
        <ThemedText variant="caption" color={colors.charcoal} style={styles.statusNote}>
          Certifications: {entitlements.certifications.join(', ')}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginBottom: spacing.xl,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  identityText: {
    marginLeft: spacing.lg,
    flexShrink: 1,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  card: {
    marginBottom: spacing.xl,
  },
  activityRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  statusNote: {
    marginTop: spacing.xs,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  linkRowLast: {
    marginBottom: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  signOut: {
    marginBottom: spacing.xl,
  },
});
