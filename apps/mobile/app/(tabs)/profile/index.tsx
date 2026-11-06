import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Card, PrimaryButton, ScreenContainer, ThemedText, PageHeader } from '@/components';
import { EditableAvatar } from '@/components/profile/EditableAvatar';
import { useEntitlements } from '@/hooks/useEntitlements';
import { usePractices } from '@/hooks/usePractices';
import { membershipStateLabel, membershipSummaryLine, tierLabel } from '@/lib/membership-copy';
import { describeWhen } from '@/lib/my-learning';
import { openTnsiPage } from '@/lib/open-web';
import { hasActivity, profileActivity } from '@/lib/profile-activity';
import type { TnsiPage } from '@/lib/web-links';
import { colors, spacing } from '@/theme';
import type { Entitlements } from '@/api/types';

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
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const entitlementsState = useEntitlements();
  const practicesState = usePractices();

  // Coming back to Profile (from the website, Membership & Access or a practice) shows what the
  // server says now. The first focus is skipped: the hooks already fetch on mount. The API client
  // changes identity on every render (see useApiClient), so the latest refresh functions are kept
  // in a ref and the focus callback itself stays stable - otherwise it would re-fire every render.
  const { refresh: refreshEntitlements } = entitlementsState;
  const { refresh: refreshPractices } = practicesState;
  const refreshAll = useRef(() => {});
  useEffect(() => {
    refreshAll.current = () => {
      refreshEntitlements();
      refreshPractices();
    };
  });
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refreshAll.current();
    }, []),
  );

  const activity = useMemo(
    () =>
      practicesState.state.status === 'success'
        ? profileActivity(practicesState.state.practices)
        : null,
    [practicesState.state],
  );

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
    } catch {
      Alert.alert('Sign Out', "We couldn't sign you out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const fullName = user?.fullName ?? null;
  const initials = initialsFor(user?.firstName ?? null, user?.lastName ?? null, email);
  const entitlementsStatus = entitlementsState.state;

  return (
    <ScreenContainer scroll underHeader inTabs>
      <PageHeader
        variant="plain"
        eyebrow="Profile"
        title="Your account, membership and progress."
      />

      <View style={styles.identityRow}>
        <EditableAvatar
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

      <SectionLabel>Membership</SectionLabel>
      <Card style={styles.card}>
        {entitlementsStatus.status === 'success' ? (
          <MembershipSummary entitlements={entitlementsStatus.entitlements} />
        ) : entitlementsStatus.status === 'loading' ? (
          <ThemedText variant="body" color={colors.charcoal}>
            Loading membership details…
          </ThemedText>
        ) : (
          // Entitlements are optional context, not identity - a failed fetch never blocks
          // the rest of the profile. A quiet inline retry (or, if the session has ended,
          // a way to sign in again) is enough; no full-screen error state.
          <Pressable
            onPress={entitlementsState.reload}
            accessibilityRole="button"
            accessibilityLabel="Retry loading membership details"
          >
            <ThemedText variant="body" color={colors.charcoal}>
              {entitlementsStatus.sessionExpired
                ? entitlementsStatus.message
                : `${entitlementsStatus.message} Tap to retry.`}
            </ThemedText>
          </Pressable>
        )}
        <Divider />
        <NavRow label="Membership & Access" onPress={() => router.push('/profile/membership')} />
      </Card>

      <SectionLabel>Practice</SectionLabel>
      <Card style={styles.card}>
        <ActivitySummary
          activity={activity}
          failed={practicesState.state.status === 'error'}
          onRetry={practicesState.reload}
        />
        <Divider />
        <NavRow label="My Learning" onPress={() => router.push('/my-learning')} />
        <Divider />
        <NavRow label="Progress" onPress={() => router.push('/profile/progress')} />
        <Divider />
        <NavRow label="Capacity Assessment" onPress={() => router.push('/profile/assessment')} />
      </Card>

      <SectionLabel>Support</SectionLabel>
      <Card style={styles.card}>
        <WebRow label="Articles and Resources" page="resources" />
        <Divider />
        <WebRow label="Contact" page="contact" />
        <Divider />
        <WebRow label="Privacy Policy" page="privacy" />
        <Divider />
        <WebRow label="Terms of Service" page="terms" />
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

function NavRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.linkRow}
    >
      <ThemedText variant="body">{label}</ThemedText>
      <ThemedText variant="body" color={colors.charcoal}>
        ›
      </ThemedText>
    </Pressable>
  );
}

/** An official TNSI page, opened in the native in-app browser. */
function WebRow({ label, page }: { label: string; page: TnsiPage }) {
  return (
    <Pressable
      onPress={() => void openTnsiPage(page)}
      accessibilityRole="link"
      accessibilityLabel={`${label}, opens in a browser window`}
      style={styles.linkRow}
    >
      <ThemedText variant="body">{label}</ThemedText>
      <ThemedText variant="body" color={colors.charcoal}>
        ›
      </ThemedText>
    </Pressable>
  );
}

function MembershipSummary({ entitlements }: { entitlements: Entitlements }) {
  const detail = membershipSummaryLine(entitlements);
  const needsAttention = entitlements.membership?.state === 'grace';
  const hasPrograms = entitlements.programs.length > 0;
  const hasCertifications = entitlements.certifications.length > 0;

  return (
    <View>
      <ThemedText variant="body">{tierLabel(entitlements)}</ThemedText>
      <ThemedText
        variant="caption"
        color={needsAttention ? colors.error : colors.charcoal}
        style={styles.statusNote}
      >
        {membershipStateLabel(entitlements)}
      </ThemedText>
      {detail ? (
        <ThemedText variant="caption" color={colors.charcoal} style={styles.statusNote}>
          {detail}
        </ThemedText>
      ) : null}
      {hasPrograms ? (
        <ThemedText variant="caption" color={colors.charcoal} style={styles.statusNote}>
          Programmes: {entitlements.programs.join(', ')}
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

/** Real practice activity only: what the practices endpoint says, or an honest "nothing yet". */
function ActivitySummary({
  activity,
  failed,
  onRetry,
}: {
  activity: ReturnType<typeof profileActivity> | null;
  failed: boolean;
  onRetry: () => void;
}) {
  if (failed) {
    return (
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry loading practice activity"
      >
        <ThemedText variant="body" color={colors.charcoal}>
          Practice activity couldn&apos;t be loaded. Tap to retry.
        </ThemedText>
      </Pressable>
    );
  }
  if (!activity) {
    return (
      <ThemedText variant="body" color={colors.charcoal}>
        Loading practice activity…
      </ThemedText>
    );
  }
  if (!hasActivity(activity)) {
    return (
      <ThemedText variant="body" color={colors.charcoal}>
        You haven&apos;t practised yet. Your activity will appear here once you do.
      </ThemedText>
    );
  }
  const lines = [
    `${activity.practised} ${activity.practised === 1 ? 'practice' : 'practices'} practised`,
    activity.inProgress > 0 ? `${activity.inProgress} in progress` : null,
    activity.lastPlayedAt
      ? `Last practised ${describeWhen(activity.lastPlayedAt).toLowerCase()}`
      : null,
  ].filter((line): line is string => line !== null);
  return (
    <View accessible accessibilityLabel={lines.join('. ')}>
      <ThemedText variant="body">{lines[0]}</ThemedText>
      {lines.slice(1).map((line) => (
        <ThemedText key={line} variant="caption" color={colors.charcoal} style={styles.statusNote}>
          {line}
        </ThemedText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
  statusNote: {
    marginTop: spacing.xs,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  signOut: {
    marginBottom: spacing.xl,
  },
});
