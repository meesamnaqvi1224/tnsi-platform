'use client';

import * as React from 'react';
import { Button, Stack, Text } from '@tnsi/ui';
import { CheckInForm } from './check-in-form';

/**
 * "Check in again" for a member who has already checked in today. Shown only when every check-in
 * drives the suggestions (the follow-up switch is on): the new check-in is saved as its own record and
 * today's suggestions follow it. Closed until asked for, so the card stays calm.
 */
export function CheckInAgain({ followUpEnabled }: { followUpEnabled: boolean }) {
  const [open, setOpen] = React.useState(false);

  if (!open) {
    return (
      <Button type="button" variant="ghost" className="w-fit" onClick={() => setOpen(true)}>
        Check in again
      </Button>
    );
  }

  return (
    <Stack gap="md">
      <Text tone="muted" size="sm">
        This is saved as a new check-in, and today&rsquo;s suggestions follow it.
      </Text>
      <CheckInForm followUpEnabled={followUpEnabled} />
    </Stack>
  );
}
