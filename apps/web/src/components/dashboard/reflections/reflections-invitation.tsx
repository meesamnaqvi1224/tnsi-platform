import NextLink from 'next/link';
import { buttonVariants, Eyebrow, Stack, Text } from '@tnsi/ui';
import { HOME_INVITATION } from '@tnsi/core';

/**
 * The quiet invitation into My Reflections on the Academy home page. It depends on no other data and
 * shows nothing about what the member has written (no counts, no streaks).
 */
export function ReflectionsInvitation() {
  return (
    <section aria-labelledby="reflections-invitation-heading">
      <div className="border-foreground/15 rounded-2xl border p-(--space-xl)">
        <Stack gap="md">
          <Eyebrow id="reflections-invitation-heading">{HOME_INVITATION.eyebrow}</Eyebrow>
          <Text tone="muted" className="max-w-xl text-base leading-[1.8]">
            {HOME_INVITATION.body}
          </Text>
          <div>
            <NextLink
              href="/dashboard/reflections/new"
              className={buttonVariants({ variant: 'outline', size: 'lg' })}
            >
              {HOME_INVITATION.button}
            </NextLink>
          </div>
        </Stack>
      </div>
    </section>
  );
}
