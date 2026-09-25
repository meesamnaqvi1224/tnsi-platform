import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Divider,
  Eyebrow,
  Stack,
  Text,
  cn,
} from '@tnsi/ui';
import type { CheckIn } from '@tnsi/db/schema';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** "2026-09-11" for a given Date, matching CheckIn.completedDate's calendar day. */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** The last 7 calendar days (today last), whatever weekday today is. */
function lastSevenDays(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

interface WeekAtAGlanceProps {
  /** Recent check-ins, newest first - only entries falling in the last 7
   * calendar days are used. Pass more than 7 (the dashboard fetches 20) so
   * gaps in check-in days don't make this window miss real check-ins. */
  recentCheckIns: Pick<CheckIn, 'completedDate'>[];
}

/**
 * A quiet "did you check in this day" reflection over the last 7 days -
 * the web counterpart to the native app's WeekAtAGlance, reusing the same
 * framing (no streak count, no score, no reward language) so a member sees
 * a consistent story regardless of which platform they open. Renders
 * nothing when there have been no check-ins this week, matching the native
 * behaviour, since this is a quiet supplementary section, not one worth an
 * empty state of its own.
 */
export function WeekAtAGlance({ recentCheckIns }: WeekAtAGlanceProps) {
  const days = lastSevenDays();
  const checkedDates = new Set(recentCheckIns.map((c) => isoDate(c.completedDate)));
  const count = days.filter((d) => checkedDates.has(isoDate(d))).length;

  if (count === 0) return null;

  return (
    <section aria-labelledby="week-heading">
      <Card>
        <CardHeader>
          <Eyebrow>This Week</Eyebrow>
          <CardTitle
            id="week-heading"
            className="font-heading text-foreground text-2xl font-semibold tracking-tight"
          >
            Your week at a glance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Stack gap="lg">
            <div className="flex justify-between">
              {days.map((d, i) => {
                const checked = checkedDates.has(isoDate(d));
                return (
                  <div key={i} className="flex flex-col items-center gap-(--space-xs)">
                    <Text tone="muted" size="xs">
                      {DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1]}
                    </Text>
                    <span
                      role="img"
                      aria-label={`${d.toLocaleDateString('en-GB', { weekday: 'long' })}${checked ? ', checked in' : ', no check-in'}`}
                      className={cn(
                        'size-7 rounded-full border',
                        checked
                          ? 'bg-foreground border-foreground'
                          : 'border-border bg-transparent',
                      )}
                    />
                  </div>
                );
              })}
            </div>

            <Text tone="muted" size="sm">
              {count} check-in{count === 1 ? '' : 's'} this week.
            </Text>
            <Divider />
            <Text className="font-heading text-center text-lg leading-relaxed italic">
              &ldquo;Consistency isn&rsquo;t about perfection. It&rsquo;s about coming back to
              yourself.&rdquo;
            </Text>
          </Stack>
        </CardContent>
      </Card>
    </section>
  );
}
