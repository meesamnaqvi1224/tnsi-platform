import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Card, PrimaryButton, ScreenContainer, ThemedText } from '@/components';
import { PageTitle } from '@/components/PageTitle';
import { SectionHeading } from '@/components/SectionHeading';
import { home, homeCardStyle } from '@/components/home/homeTheme';
import { EditableAvatar } from '@/components/profile/EditableAvatar';
import { useAccountDeletionStatus } from '@/hooks/useAccountDeletionStatus';
import { useApiClient } from '@/hooks/useApiClient';
import { useEntitlements } from '@/hooks/useEntitlements';
import { usePractices } from '@/hooks/usePractices';
import {
  accountDeletionFailure,
  accountDeletionOutcomeMessage,
  DELETE_ACCOUNT_CONFIRMATION,
  PENDING_DELETION_NOTICE,
} from '@/lib/account-deletion';
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
  const [deleting, setDeleting] = useState(false);
  const api = useApiClient();
  const deletionStatus = useAccountDeletionStatus();

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

  function confirmDeleteAccount() {
    if (deleting || signingOut) return;
    // A deletion that was started earlier and not finished goes straight to finishing it: the journal is
    // already locked, so there is nothing left to warn about losing.
    if (deletionStatus.pending) {
      void handleDeleteAccount();
      return;
    }
    Alert.alert('Delete Account', DELETE_ACCOUNT_CONFIRMATION, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Account', style: 'destructive', onPress: () => void handleDeleteAccount() },
    ]);
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    let outcome: 'deleted' | 'pending' = 'deleted';
    try {
      // 200 `deleted` = every step finished. 202 `pending` = the identity is deleted and the server is
      // still finishing the cleanup. Anything else throws and is explained below - and none of those
      // messages claim a deletion that did not complete.
      const result = await api.delete<{ status: 'deleted' | 'pending' }>('/api/v1/me/account');
      outcome = result?.status === 'pending' ? 'pending' : 'deleted';
    } catch (err) {
      const failure = accountDeletionFailure(err);
      if (failure.kind === 'subscription_active') {
        Alert.alert('Cancel your membership first', failure.message, [
          { text: 'Not now', style: 'cancel' },
          { text: 'Manage Membership', onPress: () => router.push('/profile/membership') },
        ]);
        setDeleting(false);
        return;
      }
      if (failure.kind === 'pending') deletionStatus.setPending(true); // started but unfinished: offer to finish
      if (failure.kind !== 'signed_out') {
        Alert.alert('Delete Account', failure.message);
        setDeleting(false);
        return;
      }
    }
    // The server finished (or is finishing) the deletion: tell the member exactly which, then sign out.
    const done = accountDeletionOutcomeMessage(outcome);
    Alert.alert(done.title, done.message);
    try {
      // Clears the Clerk session; RootLayout's AuthGate then redirects to (auth) once `isSignedIn`
      // flips to false. If it cannot (the session is already invalid), the next request signs out anyway.
      await signOut();
    } catch {
      // The alert above already told them where things stand.
    } finally {
      setDeleting(false);
    }
  }

  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const fullName = user?.fullName ?? null;
  const initials = initialsFor(user?.firstName ?? null, user?.lastName ?? null, email);
  const entitlementsStatus = entitlementsState.state;

  return (
    <ScreenContainer scroll underHeader inTabs background={home.page}>
      <PageTitle title="Profile" subtitle="Your account, membership and progress." />

      <Card style={{ ...styles.card, ...homeCardStyle }}>
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
            <ThemedText variant="heading" color={home.navy}>
              {fullName ?? 'Member'}
            </ThemedText>
            {email ? (
              <ThemedText variant="body" color={home.ink} numberOfLines={1} style={styles.email}>
                {email}
              </ThemedText>
            ) : null}
          </View>
        </View>
      </Card>

      <SectionHeading>Membership</SectionHeading>
      <Card style={{ ...styles.card, ...homeCardStyle }}>
        {entitlementsStatus.status === 'success' ? (
          <MembershipSummary entitlements={entitlementsStatus.entitlements} />
        ) : entitlementsStatus.status === 'loading' ? (
          <ThemedText variant="body" color={home.ink}>
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
            <ThemedText variant="body" color={home.ink}>
              {entitlementsStatus.sessionExpired
                ? entitlementsStatus.message
                : `${entitlementsStatus.message} Tap to retry.`}
            </ThemedText>
          </Pressable>
        )}
        <Divider />
        <NavRow label="Membership & Access" onPress={() => router.push('/profile/membership')} />
      </Card>

      <SectionHeading>Practice</SectionHeading>
      <Card style={{ ...styles.card, ...homeCardStyle }}>
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

      <SectionHeading>Support</SectionHeading>
      <Card style={{ ...styles.card, ...homeCardStyle }}>
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

      {deletionStatus.pending ? (
        <Card style={{ ...styles.card, ...homeCardStyle }}>
          <ThemedText variant="heading" color={home.navy}>
            Account deletion in progress
          </ThemedText>
          <ThemedText variant="body" color={home.ink} style={styles.statusNote}>
            {PENDING_DELETION_NOTICE}
          </ThemedText>
        </Card>
      ) : null}

      <Pressable
        onPress={confirmDeleteAccount}
        disabled={deleting || signingOut}
        accessibilityRole="button"
        accessibilityLabel={deletionStatus.pending ? 'Finish deleting account' : 'Delete account'}
        accessibilityHint={
          deletionStatus.pending
            ? 'Finishes closing your account'
            : 'Permanently deletes your account and your writing in My Reflections'
        }
        style={styles.deleteAccount}
      >
        <ThemedText variant="label" color={colors.error}>
          {deleting
            ? 'Deleting account…'
            : deletionStatus.pending
              ? 'Finish Deleting Account'
              : 'Delete Account'}
        </ThemedText>
      </Pressable>
    </ScreenContainer>
  );
}

function Chevron() {
  return (
    <View style={styles.chevron} accessibilityElementsHidden importantForAccessibility="no">
      <Ionicons name="chevron-forward" size={14} color={home.bronze} />
    </View>
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
      <ThemedText variant="body" color={home.navy}>
        {label}
      </ThemedText>
      <Chevron />
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
      <ThemedText variant="body" color={home.navy}>
        {label}
      </ThemedText>
      <Chevron />
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
      <ThemedText variant="heading" color={home.navy}>
        {tierLabel(entitlements)}
      </ThemedText>
      <ThemedText
        variant="caption"
        color={needsAttention ? colors.error : home.ink}
        style={styles.statusNote}
      >
        {membershipStateLabel(entitlements)}
      </ThemedText>
      {detail ? (
        <ThemedText variant="caption" color={home.ink} style={styles.statusNote}>
          {detail}
        </ThemedText>
      ) : null}
      {hasPrograms ? (
        <ThemedText variant="caption" color={home.ink} style={styles.statusNote}>
          Programmes: {entitlements.programs.join(', ')}
        </ThemedText>
      ) : null}
      {hasCertifications ? (
        <ThemedText variant="caption" color={home.ink} style={styles.statusNote}>
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
        <ThemedText variant="body" color={home.ink}>
          Practice activity couldn&apos;t be loaded. Tap to retry.
        </ThemedText>
      </Pressable>
    );
  }
  if (!activity) {
    return (
      <ThemedText variant="body" color={home.ink}>
        Loading practice activity…
      </ThemedText>
    );
  }
  if (!hasActivity(activity)) {
    return (
      <ThemedText variant="body" color={home.ink}>
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
      <ThemedText variant="body" color={home.navy}>
        {lines[0]}
      </ThemedText>
      {lines.slice(1).map((line) => (
        <ThemedText key={line} variant="caption" color={home.ink} style={styles.statusNote}>
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
    marginBottom: 0,
  },
  email: {
    fontSize: 14,
  },
  identityText: {
    marginLeft: spacing.md,
    flexShrink: 1,
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
    backgroundColor: home.border,
    marginVertical: spacing.md,
  },
  chevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: home.bronzeTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOut: {
    marginBottom: spacing.md,
  },
  deleteAccount: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
});
