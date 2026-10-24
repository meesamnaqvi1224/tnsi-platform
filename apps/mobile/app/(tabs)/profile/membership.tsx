import { Linking, StyleSheet, View } from 'react-native';
import { Card, ErrorNotice, PrimaryButton, ScreenContainer, ThemedText } from '@/components';
import { MembershipSkeleton } from '@/components/profile/MembershipSkeleton';
import { useEntitlements } from '@/hooks/useEntitlements';
import { membershipDetailLines } from '@/lib/membership-copy';
import { env } from '@/lib/env';
import { colors, spacing } from '@/theme';
import type {
  Entitlements,
  EntitlementStatus,
  EntitlementTier,
  MembershipState,
} from '@/api/types';

const TIER_LABEL: Record<EntitlementTier, string> = {
  free: 'Free Member',
  monthly: 'Monthly Member',
  annual: 'Annual Member',
  lifetime: 'Lifetime Member',
};

/**
 * Every status shown explicitly on this detailed screen (unlike Profile's
 * compact summary, which hides the unremarkable 'active' case) - "more
 * context than the compact Profile summary" is the whole point of this
 * screen existing.
 */
const STATUS_LABEL: Record<EntitlementStatus, string> = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Payment overdue',
  canceled: 'Canceled',
  expired: 'Expired',
};

/**
 * Preferred over `STATUS_LABEL` whenever the server sends its resolved
 * `membership` — this is the server's own answer to "where does this member
 * stand?", so what the app says always matches what the server enforces
 * (e.g. a payment-failed member inside the 7-day grace period is still
 * entitled, which the raw `past_due` status alone doesn't say).
 */
const MEMBERSHIP_STATE_LABEL: Record<MembershipState, string> = {
  free: 'Free account',
  trialing: 'Free trial',
  active: 'Active',
  grace: 'Payment needs attention',
  inactive: 'Membership ended',
};

function statusLabelFor(entitlements: Entitlements): string {
  return entitlements.membership
    ? MEMBERSHIP_STATE_LABEL[entitlements.membership.state]
    : STATUS_LABEL[entitlements.status];
}

/**
 * The real, already-existing web billing page - not invented. Same
 * destination for every state: it already shows either the member's
 * current plan + "Manage billing" (via the existing Stripe Customer
 * Portal, web-only) or the subscribe options, depending on their real
 * account state once they're signed in there.
 */
const MEMBERSHIP_WEB_PATH = '/dashboard/billing';

export default function MembershipScreen() {
  const { state, reload } = useEntitlements();

  return (
    <ScreenContainer scroll>
      <ThemedText variant="display" style={styles.heading}>
        Membership & Access
      </ThemedText>

      {state.status === 'loading' ? <MembershipSkeleton /> : null}

      {state.status === 'error' ? <ErrorNotice message={state.message} onRetry={reload} /> : null}

      {state.status === 'success' ? (
        <MembershipContent entitlements={state.entitlements} onRefresh={reload} />
      ) : null}
    </ScreenContainer>
  );
}

function MembershipContent({
  entitlements,
  onRefresh,
}: {
  entitlements: Entitlements;
  onRefresh: () => void;
}) {
  const isPaidRelationship = entitlements.tier !== 'free';
  const hasPrograms = entitlements.programs.length > 0;
  const hasCertifications = entitlements.certifications.length > 0;

  return (
    <View>
      <SectionLabel>Current Access</SectionLabel>
      <Card style={styles.card}>
        <View
          accessible
          accessibilityLabel={`Membership: ${TIER_LABEL[entitlements.tier]}. Status: ${statusLabelFor(entitlements)}`}
        >
          <ThemedText variant="heading">{TIER_LABEL[entitlements.tier]}</ThemedText>
          <ThemedText variant="body" color={colors.charcoal} style={styles.statusLine}>
            Status: {statusLabelFor(entitlements)}
          </ThemedText>
        </View>

        <AccessDetail entitlements={entitlements} />
      </Card>

      {hasPrograms ? (
        <>
          <SectionLabel>Programmes</SectionLabel>
          <Card style={styles.card}>
            {entitlements.programs.map((program, index) => (
              <ThemedText
                key={program}
                variant="body"
                color={colors.charcoal}
                style={index > 0 ? styles.listItem : undefined}
              >
                {program}
              </ThemedText>
            ))}
          </Card>
        </>
      ) : null}

      {hasCertifications ? (
        <>
          <SectionLabel>Certifications</SectionLabel>
          <Card style={styles.card}>
            {entitlements.certifications.map((certification, index) => (
              <ThemedText
                key={certification}
                variant="body"
                color={colors.charcoal}
                style={index > 0 ? styles.listItem : undefined}
              >
                {certification}
              </ThemedText>
            ))}
          </Card>
        </>
      ) : null}

      <SectionLabel>Manage</SectionLabel>
      <Card style={styles.card}>
        <PrimaryButton
          label={isPaidRelationship ? 'Manage Membership' : 'Visit TNSI Website'}
          variant="secondary"
          onPress={() => Linking.openURL(`${env.apiBaseUrl}${MEMBERSHIP_WEB_PATH}`)}
          style={styles.manageButton}
        />
        <ThemedText variant="caption" color={colors.charcoal} style={styles.manageNote}>
          This opens the TNSI website in your browser, where membership and billing are managed
          securely.
        </ThemedText>

        <View style={styles.refreshDivider} />
        <PrimaryButton
          label="Refresh Membership Status"
          variant="secondary"
          onPress={onRefresh}
          style={styles.refreshButton}
        />
      </Card>
    </View>
  );
}

function DetailLine({ children }: { children: string }) {
  return (
    <ThemedText variant="body" color={colors.charcoal} style={styles.detailLine}>
      {children}
    </ThemedText>
  );
}

function AccessDetail({ entitlements }: { entitlements: Entitlements }) {
  // What to say is decided in `membershipDetailLines` (unit-tested); the screen
  // only displays the server's resolved membership and never derives it.
  const lines = membershipDetailLines(entitlements);
  if (lines.length === 0) return null;
  return (
    <>
      {lines.map((line) => (
        <DetailLine key={line}>{line}</DetailLine>
      ))}
    </>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <ThemedText variant="label" color={colors.bronze} style={styles.sectionLabel}>
      {children.toUpperCase()}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  card: {
    marginBottom: spacing.xl,
  },
  statusLine: {
    marginTop: spacing.xs,
  },
  detailLine: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  listItem: {
    marginTop: spacing.sm,
  },
  manageButton: {
    marginBottom: spacing.sm,
  },
  manageNote: {
    marginBottom: spacing.md,
  },
  refreshDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  refreshButton: {
    marginBottom: 0,
  },
});
