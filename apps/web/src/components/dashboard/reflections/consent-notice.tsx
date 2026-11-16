'use client';

import * as React from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Button, Heading, Stack, Text } from '@tnsi/ui';
import { JOURNAL_CONSENT_COPY } from '@tnsi/core';
import { reflectionsApi } from '@/lib/reflections-web-client';

/**
 * The first-use acknowledgement for My Reflections (decision Q1, 16 Nov 2026). A separate step with its
 * own unticked checkbox, not part of any Terms. The button stays disabled until the box is ticked, and the
 * member can say "Not now" and leave. Recording it is the server's job; this only asks and then refreshes
 * the page, which re-reads the server's answer. Wording is PROPOSED (legal review pending) and lives in
 * `@tnsi/core`. Nothing here stores anything in the browser or logs anything.
 */
export function ConsentNotice({ version }: { version: string }) {
  const router = useRouter();
  const [agreed, setAgreed] = React.useState(false);
  const [working, setWorking] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const copy = JOURNAL_CONSENT_COPY;

  const agree = React.useCallback(async () => {
    setWorking(true);
    setFailed(false);
    try {
      await reflectionsApi.post('/api/v1/journal/consent', { version });
      router.refresh();
    } catch {
      setFailed(true);
      setWorking(false);
    }
  }, [router, version]);

  return (
    <Stack gap="md">
      <Heading as="h1" size="lg">
        {copy.title}
      </Heading>
      <Text>{copy.intro}</Text>
      <ul className="list-disc space-y-2 pl-5">
        {copy.points.map((point) => (
          <li key={point}>
            <Text as="span">{point}</Text>
          </li>
        ))}
      </ul>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          disabled={working}
        />
        <span>{copy.checkboxLabel}</span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="lg" onClick={agree} disabled={!agreed || working}>
          {working ? copy.saving : copy.agreeButton}
        </Button>
        <NextLink href="/dashboard/reflections" className="interaction-focus text-sm underline">
          {copy.notNowButton}
        </NextLink>
      </div>
      <div aria-live="polite">
        {failed ? <Alert variant="destructive">{copy.failed}</Alert> : null}
      </div>
    </Stack>
  );
}
