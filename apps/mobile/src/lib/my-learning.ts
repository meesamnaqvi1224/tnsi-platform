import type { Practice, PracticeContentType, PracticeHistoryEntry } from '@/api/types';

/**
 * My Learning's three views and how a practice is classified into them.
 *
 * The three states are independent facts about a member and a practice, not stages, so one
 * practice can be in all of them at once: saved, restarted (in progress) and completed
 * earlier. Nothing here treats that as an error.
 *
 * - In progress: the LATEST session is unfinished, with some real progress. This is what
 *   `GET /api/v1/practices` reports as `progress` (it attaches only the latest session).
 * - Completed: the practice has been completed AT LEAST ONCE, in any session. The list
 *   endpoint cannot say this (a restarted practice's latest session is not completed), so
 *   this comes from Practice History, which has one entry per completed session.
 * - Saved: bookmarked, independent of completion.
 */

export type LearningView = 'in-progress' | 'completed' | 'saved' | 'check-ins';

export const LEARNING_VIEWS: readonly LearningView[] = [
  'in-progress',
  'completed',
  'saved',
  'check-ins',
];

/** A route param to a view; anything unrecognised opens the default (In Progress). */
export function parseLearningView(raw: string | string[] | undefined): LearningView {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return LEARNING_VIEWS.find((view) => view === value) ?? 'in-progress';
}

function timeOf(iso: string | null | undefined): number {
  if (!iso) return 0;
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/** Practices whose latest session is unfinished and has real progress, most recently played first. */
export function inProgressPractices(practices: readonly Practice[]): Practice[] {
  return practices
    .filter((practice) => {
      const pct = practice.progress?.progressPct ?? 0;
      return !practice.progress?.completed && pct > 0 && pct < 1;
    })
    .sort((a, b) => timeOf(b.progress?.lastPlayedAt) - timeOf(a.progress?.lastPlayedAt));
}

/** One distinct practice the member has completed at least once. */
export interface CompletedItem {
  id: string;
  title: string;
  description: string | null;
  contentType: PracticeContentType;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  /** When it was most recently completed. */
  completedAt: string;
  /** How many completed sessions were counted. Only sessions already loaded are counted. */
  sessions: number;
}

/**
 * Distinct practices completed at least once, most recently completed first.
 *
 * `history` has one entry per completed session (a practice repeats if it was completed more
 * than once). Practices the list reports as completed in their latest session but that are not
 * yet in the loaded history are added too, so a practice is never dropped just because Practice
 * History is paged and a later page has not been loaded.
 */
export function completedEver(
  history: readonly PracticeHistoryEntry[],
  practices: readonly Practice[] = [],
): CompletedItem[] {
  const byId = new Map<string, CompletedItem>();

  for (const entry of history) {
    const existing = byId.get(entry.id);
    if (!existing) {
      byId.set(entry.id, {
        id: entry.id,
        title: entry.title,
        description: entry.description,
        contentType: entry.contentType,
        thumbnailUrl: entry.thumbnailUrl,
        durationSeconds: entry.durationSeconds,
        completedAt: entry.completedAt,
        sessions: 1,
      });
    } else {
      existing.sessions += 1;
      if (timeOf(entry.completedAt) > timeOf(existing.completedAt)) {
        existing.completedAt = entry.completedAt;
      }
    }
  }

  for (const practice of practices) {
    const completedAt = practice.progress?.completedAt;
    if (practice.progress?.completed && completedAt && !byId.has(practice.id)) {
      byId.set(practice.id, {
        id: practice.id,
        title: practice.title,
        description: practice.description,
        contentType: practice.contentType,
        thumbnailUrl: practice.thumbnailUrl,
        durationSeconds: practice.durationSeconds,
        completedAt,
        sessions: 1,
      });
    }
  }

  return [...byId.values()].sort((a, b) => timeOf(b.completedAt) - timeOf(a.completedAt));
}

/** All three facts about one practice, for showing the overlap on any row. */
export interface LearningStatus {
  /** 0 to 1 when the latest session is unfinished, otherwise null. */
  inProgressPct: number | null;
  lastPlayedAt: string | null;
  /** When it was last completed, if it ever was. */
  completedAt: string | null;
  saved: boolean;
}

export interface LearningIndex {
  statusOf: (practiceId: string) => LearningStatus;
}

export function buildLearningIndex(input: {
  practices: readonly Practice[];
  completed: readonly CompletedItem[];
  savedIds: ReadonlySet<string>;
}): LearningIndex {
  const inProgress = new Map(inProgressPractices(input.practices).map((p) => [p.id, p]));
  const completed = new Map(input.completed.map((item) => [item.id, item]));

  return {
    statusOf(practiceId) {
      const progress = inProgress.get(practiceId)?.progress ?? null;
      return {
        inProgressPct: progress ? (progress.progressPct ?? 0) : null,
        lastPlayedAt: progress?.lastPlayedAt ?? null,
        completedAt: completed.get(practiceId)?.completedAt ?? null,
        saved: input.savedIds.has(practiceId),
      };
    },
  };
}

/** "2026-10-29T..." -> "29 Oct 2026"; "" when it is not a real date. */
export function formatLearningDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Today", "Yesterday", "3 days ago", then a date from a week on. */
export function describeWhen(iso: string, now: Date = new Date()): string {
  const time = timeOf(iso);
  if (!time) return '';
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(new Date(time))) / DAY_MS);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatLearningDate(iso);
}

/** Like `describeWhen`, for the middle of a sentence ("Last played today"); a date is unchanged. */
export function describeWhenInline(iso: string, now: Date = new Date()): string {
  const text = describeWhen(iso, now);
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** 0.4237 -> "42%". */
export function percentLabel(progressPct: number): string {
  return `${Math.round(Math.min(1, Math.max(0, progressPct)) * 100)}%`;
}
