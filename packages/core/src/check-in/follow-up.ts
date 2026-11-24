/**
 * The check-in follow-up answer and the pure logic that turns it into suggestions.
 *
 * After the first check-in answer the member may answer one more question: pick the feeling that
 * fits right now (a protection pattern), say they are not sure, or - when they feel good or choose
 * to grow - pick Expansion or Participation. The answer is stored with the check-in as ids, never
 * wording (see `FollowUp`), and read back here. Nothing in this file touches a database or the CMS.
 *
 * Settle paths (a pattern, or not sure): the member sees exactly the two practices Caroline chose,
 * in order. Grow path: the member's choice goes first in the usual ranking of all content, so
 * guided practices, PowerDrops and Somatic Cards of that condition lead.
 */
import { normalizeCapacityScore } from '../practices/recommendation';
import {
  HET_PREFERENCE_BY_CAPACITY_STATE,
  type HetCondition,
} from '../practices/het-recommendation';
import {
  isProtectionPatternId,
  type FollowUpPick,
  type FollowUpPickKind,
  type FollowUpRouting,
  type ProtectionPatternId,
} from './follow-up-routing';

export const FOLLOW_UP_VERSION = 1;

/** `v` lets the question set change later without ambiguity about old rows. */
export type FollowUp =
  | { v: 1; path: 'pattern'; pattern: ProtectionPatternId }
  | { v: 1; path: 'unsure' }
  | { v: 1; path: 'grow'; growArea: 'expansion' | 'participation' };

export type SettleFollowUp = Extract<FollowUp, { path: 'pattern' | 'unsure' }>;
export type GrowFollowUp = Extract<FollowUp, { path: 'grow' }>;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/** A stored or submitted follow-up as a valid `FollowUp`, or `null`. Never throws. */
export function parseFollowUp(raw: unknown): FollowUp | null {
  const r = asRecord(raw);
  if (!r || r.v !== FOLLOW_UP_VERSION) return null;
  if (r.path === 'pattern') {
    return isProtectionPatternId(r.pattern) ? { v: 1, path: 'pattern', pattern: r.pattern } : null;
  }
  if (r.path === 'unsure') return { v: 1, path: 'unsure' };
  if (r.path === 'grow') {
    return r.growArea === 'expansion' || r.growArea === 'participation'
      ? { v: 1, path: 'grow', growArea: r.growArea }
      : null;
  }
  return null;
}

/**
 * Whether a follow-up can follow this first answer. The settle paths are offered for answers 1 and 2,
 * and for 3 when the member chose Help me settle; the grow path for 4 and 5, and for 3 when they chose
 * Help me grow. So a settle path needs an answer of 3 or lower and a grow path 3 or higher.
 */
export function followUpFitsAnswer(followUp: FollowUp, capacityScore: number): boolean {
  if (!Number.isInteger(capacityScore) || capacityScore < 1 || capacityScore > 5) return false;
  return followUp.path === 'grow' ? capacityScore >= 3 : capacityScore <= 3;
}

/** Parses and checks a follow-up against the answer it came with: anything inconsistent is dropped. */
export function normalizeFollowUp(raw: unknown, capacityScore: number): FollowUp | null {
  const followUp = parseFollowUp(raw);
  return followUp && followUpFitsAnswer(followUp, capacityScore) ? followUp : null;
}

export function isSettleFollowUp(
  followUp: FollowUp | null | undefined,
): followUp is SettleFollowUp {
  return followUp?.path === 'pattern' || followUp?.path === 'unsure';
}

/**
 * The order of conditions for a member who chose to grow: their choice first, then the answer's usual
 * order for the rest, so content is never missing just because one condition has little in it.
 * `undefined` for every other path, which keeps the answer's own order.
 */
export function hetPreferenceForFollowUp(
  capacityScore: number,
  followUp: FollowUp | null | undefined,
): readonly HetCondition[] | undefined {
  if (followUp?.path !== 'grow') return undefined;
  const chosen: HetCondition = followUp.growArea === 'expansion' ? 'Expansion' : 'Participation';
  const usual = HET_PREFERENCE_BY_CAPACITY_STATE[normalizeCapacityScore(capacityScore)];
  return [chosen, ...usual.filter((c) => c !== chosen)];
}

/** What the settle path needs to know about a card or PowerDrop. */
export type FollowUpCandidate = {
  kind: FollowUpPickKind;
  slug: string;
  /** Draft pattern tags, used only to fill a gap behind the explicit picks. */
  patterns: readonly string[];
  /** A free-tier member can open it. */
  isFree: boolean;
};

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The practices for a settle follow-up: Caroline's two for the pattern (or the fixed "not sure"
 * pair), in order. A listed item that is not available (unpublished, or locked for a free member) is
 * replaced from content tagged with the same pattern, then from `fallback` (the answer-only
 * suggestions), so the member always gets two where the library allows. Returns at most `count`.
 */
export function pickSettleItems<T extends FollowUpCandidate>(
  input: {
    routing: FollowUpRouting;
    followUp: SettleFollowUp;
    candidates: readonly T[];
    fallback: readonly T[];
    freeOnly?: boolean;
    userKey: string;
    dayKey: string;
  },
  count = 2,
): T[] {
  const { routing, followUp, candidates, fallback, freeOnly = false } = input;
  const usable = (c: T) => !freeOnly || c.isFree;
  const find = (pick: FollowUpPick) =>
    candidates.find((c) => c.kind === pick.kind && c.slug === pick.slug);

  const listed =
    followUp.path === 'unsure'
      ? routing.notSure
      : (routing.patterns.find((p) => p.id === followUp.pattern)?.picks ?? []);

  const chosen: T[] = [];
  const has = (item: T) => chosen.some((c) => c.kind === item.kind && c.slug === item.slug);
  const add = (item: T | undefined) => {
    if (item && usable(item) && !has(item) && chosen.length < count) chosen.push(item);
  };

  for (const pick of listed) add(find(pick));

  if (chosen.length < count && followUp.path === 'pattern') {
    const rotated = candidates
      .filter((c) => c.patterns.includes(followUp.pattern))
      .sort(
        (a, b) =>
          hash(`${input.userKey}|${input.dayKey}|${a.slug}`) -
          hash(`${input.userKey}|${input.dayKey}|${b.slug}`),
      );
    for (const item of rotated) add(item);
  }
  for (const item of fallback) add(item);
  return chosen;
}
