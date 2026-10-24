import NextLink from 'next/link';
import { buttonVariants, Stack, Text } from '@tnsi/ui';

/**
 * Shown in place of a practice's player when it belongs to the paid
 * Regulation Suite™ library and the member does not have paid access. The
 * server has already withheld the media (see `withPracticeAccess` /
 * the practice page's own `canOpen` check) — this is purely the prompt.
 */
export function LockedPracticeNotice() {
  return (
    <div className="border-border/80 bg-background rounded-sm border p-(--space-lg)">
      <Stack gap="md">
        <Text tone="muted">
          This practice is part of the full Regulation Suite™ library, available with a membership.
        </Text>
        <div>
          <NextLink
            href="/dashboard/billing"
            className={buttonVariants({ variant: 'primary', size: 'md' })}
          >
            View membership options
          </NextLink>
        </div>
      </Stack>
    </div>
  );
}
