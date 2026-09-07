/** "680" seconds -> "11 min". Rounds to the nearest minute; under a minute reads as "1 min". */
export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

/** "meditation" -> "Meditation". Display formatting only - the value itself is never invented. */
export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** "2026-06-12T00:00:00.000Z" -> "June 2026" - mirrors apps/web/src/content/cms/loaders.ts's `formatMonth`. */
export function formatArticleDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
