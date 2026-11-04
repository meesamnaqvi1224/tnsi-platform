import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { Card, ErrorNotice, PrimaryButton, ScreenContainer, ThemedText } from '@/components';
import { MembershipSkeleton } from '@/components/profile/MembershipSkeleton';
import { useEntitlements } from '@/hooks/useEntitlements';
import {
  membershipActionLabel,
  membershipDetailLines,
  membershipStateLabel,
  tierLabel,
} from '@/lib/membership-copy';
import { openTnsiPage } from '@/lib/open-web';
import { colors, spacing } from '@/theme';
import type { Entitlements } from '@/api/types';

export default function MembershipScreen() {
  const { state, reload } = useEntitlements();
  const { signOut } = useAuth();

  return (
    <ScreenContainer scroll underHeader inTabs>
      <ThemedText variant="display" style={styles.heading}>
        Membership & Access
      </ThemedText>

      {state.status === 'loading' ? <MembershipSkeleton /> : null}

      {state.status === 'error' ? (
        <ErrorNotice
          message={state.message}
          onRetry={reload}
          onSignInAgain={state.sessionExpired ? () => void signOut() : undefined}
        />
      ) : null}

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
  const [opening, setOpening] = useState(false);
  const hasPrograms = entitlements.programs.length > 0;
  const hasCertifications = entitlements.certifications.length > 0;

  return (
    <View>
      <SectionLabel>Current Access</SectionLabel>
      <Card style={styles.card}>
        <View
          accessible
          accessibilityLabel={`Membership: ${tierLabel(entitlements)}. Status: ${membershipStateLabel(entitlements)}`}
        >
          <ThemedText variant="heading">{tierLabel(entitlements)}</ThemedText>
          <ThemedText variant="body" color={colors.charcoal} style={styles.statusLine}>
            Status: {membershipStateLabel(entitlements)}
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
          label={membershipActionLabel(entitlements)}
          variant="secondary"
          loading={opening}
          onPress={async () => {
            setOpening(true);
            try {
              await openTnsiPage('billing');
            } finally {
              setOpening(false);
              // The member may have changed their plan on the website: show what the server now says.
              onRefresh();
            }
          }}
          style={styles.manageButton}
        />
        <ThemedText variant="caption" color={colors.charcoal} style={styles.manageNote}>
          This opens the TNSI website in a secure browser window, where membership and billing are
          managed.
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
