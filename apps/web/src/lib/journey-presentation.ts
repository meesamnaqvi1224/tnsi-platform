/**
 * My Journey's pure presentation logic - shaping, grouping, and labeling
 * already-fetched data for display. Deliberately free of any `@tnsi/db`
 * import (unlike journey.ts, which does the actual querying) so this file
 * can be unit-tested directly, the same reasoning as practice-sessions.ts.
 *
 * This is presentation only: every value here comes from something the
 * member actually recorded (a completed practice, their own reflection,
 * their own check-in answer). Nothing here computes, scores, or infers
 * anything about their nervous system, progress, or wellbeing - see each
 * function's own comment for exactly what it does and doesn't do.
 */

export type PostPracticeResponseValue = 'DIFFERENT' | 'SAME' | 'NOT_SURE';

export interface PracticeJourneyEntry {
  kind: 'practice';
  id: string;
  occurredAt: Date;
  practiceId: string;
  title: string;
  contentType: string;
  category: string | null;
  durationSeconds: number | null;
  reflection: {
    response: PostPracticeResponseValue | null;
    reflection: string | null;
  } | null;
}

export interface CheckInJourneyEntry {
  kind: 'check_in';
  id: string;
  occurredAt: Date;
  moodScore: number;
  capacityScore: number;
  notes: string | null;
}

export type JourneyEntry = PracticeJourneyEntry | CheckInJourneyEntry;

/** Shape of one row from getJourneyEntries's merged practice/check-in SQL, before reflections are attached. */
export interface JourneyRawRow {
  kind: 'practice' | 'check_in';
  entryId: string;
  occurredAt: Date;
  practiceId: string | null;
  practiceTitle: string | null;
  practiceContentType: string | null;
  practiceCategory: string | null;
  practiceDurationSeconds: number | null;
  moodScore: number | null;
  capacityScore: number | null;
  notes: string | null;
}

export interface JourneyReflection {
  response: PostPracticeResponseValue | null;
  reflection: string | null;
}

/**
 * Turns one raw merged row plus its reflection (if any) into the
 * JourneyEntry the UI renders. Pure - no DB - so "a row with a missing
 * category/duration/reflection still maps to a valid entry" and "the
 * output only ever carries fields that came from the row itself" are
 * both directly testable against plain data.
 */
export function mapJourneyRow(
  row: JourneyRawRow,
  reflectionByCompletionId: Map<string, JourneyReflection>,
): JourneyEntry {
  if (row.kind === 'practice') {
    return {
      kind: 'practice',
      id: row.entryId,
      occurredAt: row.occurredAt,
      practiceId: row.practiceId as string,
      title: row.practiceTitle as string,
      contentType: row.practiceContentType as string,
      category: row.practiceCategory,
      durationSeconds: row.practiceDurationSeconds,
      reflection: reflectionByCompletionId.get(row.entryId) ?? null,
    };
  }
  return {
    kind: 'check_in',
    id: row.entryId,
    occurredAt: row.occurredAt,
    moodScore: row.moodScore as number,
    capacityScore: row.capacityScore as number,
    notes: row.notes,
  };
}

/** "Today" / "Yesterday" / "14 Sep" - the same two-special-cases approach Practice History's own formatSessionDate already uses; `now` is a parameter (not read internally) so this is directly testable without mocking the clock. */
export function formatJourneyDate(date: Date, now: Date): string {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (startOfDay.getTime() === startOfToday.getTime()) return 'Today';
  if (startOfDay.getTime() === startOfYesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export interface JourneyGroup {
  label: string;
  entries: JourneyEntry[];
}

/**
 * Groups an already-newest-first list of entries into date sections,
 * preserving order within and across groups (it never re-sorts - a
 * caller that hands this an out-of-order list gets out-of-order groups
 * back). Grouped by actual calendar day (year/month/date), not by the
 * display label string, so two different "14 Sep"s a year apart can
 * never merge into one section.
 */
export function groupJourneyEntriesByDate(entries: JourneyEntry[], now: Date): JourneyGroup[] {
  const groups: JourneyGroup[] = [];
  let currentKey: string | null = null;
  let currentGroup: JourneyGroup | null = null;

  for (const entry of entries) {
    const d = entry.occurredAt;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (key !== currentKey || !currentGroup) {
      currentGroup = { label: formatJourneyDate(d, now), entries: [] };
      groups.push(currentGroup);
      currentKey = key;
    }
    currentGroup.entries.push(entry);
  }

  return groups;
}

/**
 * The plain-language label for a single-question check-in answer (mirrors
 * CheckInCard's own `capacityOptionLabel` mapping and its own
 * `moodScore === capacityScore` check - the single Daily Check-In question
 * submits the same value as both, so that equality is what distinguishes
 * a real answer from a legacy two-question check-in with genuinely
 * different mood/capacity values). Returns `null` for a legacy row (the
 * caller falls back to showing the two raw numbers, same as CheckInCard
 * already does) or an out-of-range score - never invents a label.
 */
const CAPACITY_LABELS: Record<number, string> = {
  1: 'A lot is going on',
  2: "I'm feeling unsettled",
  3: "I'm okay",
  4: "I'm feeling good",
  5: "I'm feeling really well",
};

export function checkInJourneyLabel(entry: CheckInJourneyEntry): string | null {
  if (entry.moodScore !== entry.capacityScore) return null;
  return CAPACITY_LABELS[entry.capacityScore] ?? null;
}

/**
 * A short preview of reflection text for the timeline card - full text is
 * still saved and retrievable elsewhere (the practice's own detail page);
 * this only shortens what's shown inline. Truncates on a word boundary
 * where possible rather than mid-word.
 */
export function truncateReflection(text: string, maxLength = 140): string {
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(' ');
  const boundary = lastSpace > maxLength * 0.6 ? lastSpace : maxLength;
  return `${slice.slice(0, boundary).trimEnd()}…`;
}
