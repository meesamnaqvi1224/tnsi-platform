import type { JourneyEntry } from '@/api/types';

/** "Today" / "Yesterday" / "14 Sep" - mirrors PracticeHistoryRow's own formatSessionDate. */
export function formatJourneyDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (startOfDay.getTime() === startOfToday.getTime()) return 'Today';
  if (startOfDay.getTime() === startOfYesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

export interface JourneyGroup {
  label: string;
  entries: JourneyEntry[];
}

/**
 * Groups an already-newest-first list of entries into date sections,
 * preserving order within and across groups. Grouped by actual calendar
 * day, not by the display label string, so two different "14 Sep"s a
 * year apart can never merge into one section.
 */
export function groupJourneyEntriesByDate(entries: JourneyEntry[]): JourneyGroup[] {
  const groups: JourneyGroup[] = [];
  let currentKey: string | null = null;
  let currentGroup: JourneyGroup | null = null;

  for (const entry of entries) {
    const d = new Date(entry.occurredAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (key !== currentKey || !currentGroup) {
      currentGroup = { label: formatJourneyDate(entry.occurredAt), entries: [] };
      groups.push(currentGroup);
      currentKey = key;
    }
    currentGroup.entries.push(entry);
  }

  return groups;
}
