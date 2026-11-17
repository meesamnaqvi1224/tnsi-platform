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
import { PageTitle } from '@/components/PageTitle';
import { SectionHeading } from '@/components/SectionHeading';
import { home, homeCardStyle } from '@/components/home/homeTheme';
import { spacing } from '@/theme';
import type { Entitlements } from '@/api/types';

export default function MembershipScreen() {
  const { state, reload } = useEntitlements();
  const { signOut } = useAuth();

  return (
    <ScreenContainer scroll underHeader inTabs background={home.page}>
      <PageTitle title="Membership & Access" subtitle="Your current access and how to manage it." />

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
      <SectionHeading>Current Access</SectionHeading>
      <Card style={{ ...styles.card, ...homeCardStyle }}>
        <View
          accessible
          accessibilityLabel={`Membership: ${tierLabel(entitlements)}. Status: ${membershipStateLabel(entitlements)}`}
        >
          <ThemedText variant="heading" color={home.navy}>
            {tierLabel(entitlements)}
          </ThemedText>
          <ThemedText variant="body" color={home.ink} style={styles.statusLine}>
            Status: {membershipStateLabel(entitlements)}
          </ThemedText>
        </View>

        <AccessDetail entitlements={entitlements} />
      </Card>

      {hasPrograms ? (
        <>
          <SectionHeading>Programmes</SectionHeading>
          <Card style={{ ...styles.card, ...homeCardStyle }}>
            {entitlements.programs.map((program, index) => (
              <ThemedText
                key={program}
                variant="body"
                color={home.ink}
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
          <SectionHeading>Certifications</SectionHeading>
          <Card style={{ ...styles.card, ...homeCardStyle }}>
            {entitlements.certifications.map((certification, index) => (
              <ThemedText
                key={certification}
                variant="body"
                color={home.ink}
                style={index > 0 ? styles.listItem : undefined}
              >
                {certification}
              </ThemedText>
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeading>Manage</SectionHeading>
      <Card style={{ ...styles.card, ...homeCardStyle }}>
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
        <ThemedText variant="caption" color={home.ink} style={styles.manageNote}>
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
    <ThemedText variant="body" color={home.ink} style={styles.detailLine}>
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

const styles = StyleSheet.create({
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
    borderTopColor: home.border,
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
    backgroundColor: home.border,
    marginBottom: spacing.md,
  },
  refreshButton: {
    marginBottom: 0,
  },
});
