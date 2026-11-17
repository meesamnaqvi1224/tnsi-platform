import { formatLearningDate, type LearningStatus, type LearningView } from '@/lib/my-learning';

/**
 * The status lines that tell a member about the OTHER states a practice is in, so an overlap is
 * visible and unremarkable: a saved practice that is also in progress, or a completed one that
 * has been restarted. The view a row is already in is never repeated.
 */
export function otherStateLines(status: LearningStatus, current: LearningView): string[] {
  const parts: string[] = [];
  if (current !== 'saved' && status.saved) parts.push('Saved');
  if (current !== 'completed' && status.completedAt) {
    const date = formatLearningDate(status.completedAt);
    parts.push(date ? `Completed ${date}` : 'Completed');
  }
  // One line, so a practice in several states stays compact: "Saved · Completed 29 Oct 2026".
  return parts.length > 0 ? [parts.join(' · ')] : [];
}
