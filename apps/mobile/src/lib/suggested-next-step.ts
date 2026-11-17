import { relativeDay } from '@/lib/relative-day';
import type { Practice, TodayResponse } from '@/api/types';

type LastCompleted = NonNullable<TodayResponse['progressSummary']>['lastCompleted'];

/**
 * The "suggested next step" shown on Home's progress widget and at the top of My Progress.
 *
 * The product rule: after a practice is completed, show a next appropriate step ONLY if one is
 * available, and never push the member on. So while today's recommended practice has not been
 * completed today it is the suggestion; once it has, the suggestion is the one optional alternative
 * from the same category (if there is one and it has not been completed today either), and
 * otherwise there is none and the row is simply not shown. This reads the existing recommendation
 * and alternative - it adds no routing of its own and changes no mapping.
 *
 * "Completed today" uses the practice's own latest session (`progress`, attached to the
 * recommendation) and, for the alternative, the most recent completion in the progress summary.
 */
export function suggestedNextStep({
  recommended,
  alternative,
  lastCompleted,
  now = new Date(),
}: {
  recommended: Practice | null | undefined;
  alternative: Practice | null | undefined;
  lastCompleted: LastCompleted | undefined;
  now?: Date;
}): Practice | null {
  if (!recommended) return null;

  const completedToday = (practice: Practice): boolean => {
    const own = practice.progress;
    if (own?.completed && own.completedAt && relativeDay(own.completedAt, now) === 'Today') {
      return true;
    }
    return (
      !!lastCompleted &&
      lastCompleted.practiceId === practice.id &&
      relativeDay(lastCompleted.completedAt, now) === 'Today'
    );
  };

  if (!completedToday(recommended)) return recommended;
  if (alternative && !completedToday(alternative)) return alternative;
  return null;
}
