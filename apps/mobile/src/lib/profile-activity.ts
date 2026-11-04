import type { Practice } from '@/api/types';
import { inProgressPractices } from '@/lib/my-learning';

/**
 * Profile's practice-activity summary, computed only from what
 * `GET /api/v1/practices` returns (each practice's latest session as `progress`).
 * Nothing is estimated. The "completed at least once" count lives in My Learning,
 * which reads Practice History; it is not repeated here so the two screens can never
 * show different totals.
 */
export interface ProfileActivity {
  /** Practices the member has played at least once. */
  practised: number;
  /** Practices whose latest session is unfinished (the same rule as My Learning's In Progress). */
  inProgress: number;
  /** When the member last played any practice, or null. */
  lastPlayedAt: string | null;
}

export function profileActivity(practices: readonly Practice[]): ProfileActivity {
  let practised = 0;
  let latest = 0;
  for (const practice of practices) {
    const progress = practice.progress;
    if (!progress || progress.playCount < 1) continue;
    practised += 1;
    const time = progress.lastPlayedAt ? new Date(progress.lastPlayedAt).getTime() : 0;
    if (!Number.isNaN(time) && time > latest) latest = time;
  }
  return {
    practised,
    inProgress: inProgressPractices(practices).length,
    lastPlayedAt: latest > 0 ? new Date(latest).toISOString() : null,
  };
}

export function hasActivity(activity: ProfileActivity): boolean {
  return activity.practised > 0;
}
