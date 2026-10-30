import { RETURN_PATH_KEY } from '@tnsi/core';
import {
  formatContentTypeLabel,
  getCompletedPracticeCount,
  getInProgressPracticeCount,
  getPublishedPractices,
  getSavedPractices,
  type PracticeSummary,
} from '@/lib/practices';

/** How many places to begin the membership page suggests. */
const STARTER_COUNT = 3;

export interface MembershipHighlights {
  /** Distinct published practices the member has completed. */
  completed: number;
  /** Practices started and not yet finished. */
  inProgress: number;
  /** Practices the member has saved. */
  saved: number;
  /** Real published practices to begin with. */
  starters: { id: string; title: string; contentType: string; typeLabel: string }[];
}

/**
 * Up to three published practices to begin with: The Return Path when it is
 * published, then the rest in the library's own order, preferring a different
 * kind of practice each time so the three are not all alike. Selection only -
 * nothing is invented, and an empty library yields an empty list.
 */
export function pickStarterPractices(
  practices: readonly PracticeSummary[],
  count: number = STARTER_COUNT,
): PracticeSummary[] {
  const picked: PracticeSummary[] = [];
  const returnPath = practices.find(
    (practice) =>
      practice.contentType === 'interactive' && practice.interactiveKey === RETURN_PATH_KEY,
  );
  if (returnPath) picked.push(returnPath);

  const rest = practices.filter((practice) => practice !== returnPath);
  const seenTypes = new Set(picked.map((practice) => practice.contentType));
  for (const practice of rest) {
    if (picked.length >= count) break;
    if (!seenTypes.has(practice.contentType)) {
      picked.push(practice);
      seenTypes.add(practice.contentType);
    }
  }
  for (const practice of rest) {
    if (picked.length >= count) break;
    if (!picked.includes(practice)) picked.push(practice);
  }
  return picked;
}

/**
 * What the membership page shows a member who has full access: their own
 * counts and a few real practices to begin with. Read-only; the counts use the
 * same functions as the dashboard so the numbers agree.
 */
export async function getMembershipHighlights(userId: string): Promise<MembershipHighlights> {
  const [completed, inProgress, saved, library] = await Promise.all([
    getCompletedPracticeCount(userId),
    getInProgressPracticeCount(userId),
    getSavedPractices(userId),
    getPublishedPractices(),
  ]);

  return {
    completed,
    inProgress,
    saved: saved.length,
    starters: pickStarterPractices(library).map((practice) => ({
      id: practice.id,
      title: practice.title,
      contentType: practice.contentType,
      typeLabel: formatContentTypeLabel(practice.contentType),
    })),
  };
}
