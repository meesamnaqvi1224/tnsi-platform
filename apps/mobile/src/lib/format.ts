/** "680" seconds -> "11 min". Rounds to the nearest minute; under a minute reads as "1 min". */
export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

/** "meditation" -> "Meditation". Display formatting only - the value itself is never invented. */
export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
