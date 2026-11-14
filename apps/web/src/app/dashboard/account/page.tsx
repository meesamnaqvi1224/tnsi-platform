import NextLink from 'next/link';
import { Container, Heading, Section, Stack, Text } from '@tnsi/ui';
import { DeleteAccountPanel } from '@/components/dashboard/delete-account-panel';
import { requireAuthOrRedirect } from '@/lib/auth-api';
import { isDeletionPending } from '@/lib/deletion-state';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Account',
  description: 'Manage your TNSI account.',
  path: '/dashboard/account',
  noIndex: true,
});

/**
 * Account settings. Today this holds one thing: deleting the account. Any signed-in account can reach it
 * (not only paying members), and a deletion that was started but not finished is surfaced so it can be
 * completed. The page acts only on the signed-in member.
 */
export default async function AccountPage() {
  const user = await requireAuthOrRedirect();
  const pending = await isDeletionPending(user.id);

  return (
    <Section spacing="lg" aria-labelledby="account-heading">
      <Container size="lg">
        <Stack gap="xl">
          <Stack gap="sm">
            <Heading as="h1" size="xl" id="account-heading">
              Account
            </Heading>
            <Text tone="muted">{user.email}</Text>
          </Stack>

          <Stack gap="md">
            <Heading as="h2" size="md">
              Delete your account
            </Heading>
            <Text tone="muted">
              Deleting your account permanently deletes everything you wrote in My Reflections and
              removes your sign-in.{' '}
              <NextLink href="/delete-account" className="interaction-focus underline">
                Read exactly what happens
              </NextLink>
              .
            </Text>
            <DeleteAccountPanel initialPending={pending} />
          </Stack>
        </Stack>
      </Container>
    </Section>
  );
}
