/**
 * Check-in follow-up routing: the data side of the second daily check-in question. After the first
 * answer the app will ask "What does it feel like right now?" (one of 13 feelings, called protection
 * patterns by the team) and send the member to the two practices Caroline chose for it. This file
 * only describes and validates that routing table (`checkin-suggestions-v1.json`, next to this file); nothing
 * reads it at runtime yet, so merging it changes no behaviour. The ranking that will use it is a later
 * step (see the check-in follow-up spec).
 *
 * The pattern names are the team's language. A member only ever sees `memberText`.
 */
import routingJson from './checkin-suggestions-v1.json';

export const PROTECTION_PATTERN_IDS = [
  'protective-anger-reactivity',
  'control-over-management',
  'injustice-defensive-bracing',
  'functional-overdrive',
  'hypervigilance',
  'relational-threat-social-withdrawal',
  'functional-freeze',
  'disconnection-numbing',
  'capacity-overload',
  'appeasement-boundary-loss',
  'emotional-absorption-over-responsibility',
  'self-silencing-approval-seeking',
  'visceral-alarm-gut-focused-distress',
] as const;

export type ProtectionPatternId = (typeof PROTECTION_PATTERN_IDS)[number];

export function isProtectionPatternId(value: unknown): value is ProtectionPatternId {
  return (PROTECTION_PATTERN_IDS as readonly unknown[]).includes(value);
}

/** The two kinds of content a check-in pick can point at. Each is identified by its Sanity slug. */
export const FOLLOW_UP_PICK_KINDS = ['somaticCard', 'powerDrop'] as const;
export type FollowUpPickKind = (typeof FOLLOW_UP_PICK_KINDS)[number];

export type FollowUpPick = { kind: FollowUpPickKind; slug: string };

export type FollowUpPatternRoute = {
  id: ProtectionPatternId;
  /** Fight, Flight, Freeze, Fawn or Mixed: the workbook's grouping, for the team only. */
  group: string;
  /** The team's name for the pattern. Never shown to members. */
  pattern: string;
  /** The plain words the member sees. */
  memberText: string;
  /** Exactly two practices, in the order they are offered. */
  picks: [FollowUpPick, FollowUpPick];
};

export type FollowUpRouting = {
  version: number;
  patternQuestion: string;
  helpMostQuestion: string;
  helpMostOptions: { settle: string; grow: string };
  notSureLabel: string;
  growOptions: {
    expansion: { label: string; condition: 'Expansion' };
    participation: { label: string; condition: 'Participation' };
  };
  /** Offered when the member does not know what to pick. Exactly two. */
  notSure: [FollowUpPick, FollowUpPick];
  patterns: FollowUpPatternRoute[];
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const text = (value: unknown, max = 300): string | null =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max
    ? value.trim()
    : null;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parsePick(raw: unknown): FollowUpPick | null {
  const r = asRecord(raw);
  if (!r) return null;
  const kind = (FOLLOW_UP_PICK_KINDS as readonly unknown[]).includes(r.kind)
    ? (r.kind as FollowUpPickKind)
    : null;
  const slug = typeof r.slug === 'string' && SLUG.test(r.slug) ? r.slug : null;
  return kind && slug ? { kind, slug } : null;
}

function parsePair(raw: unknown): [FollowUpPick, FollowUpPick] | null {
  if (!Array.isArray(raw) || raw.length !== 2) return null;
  const a = parsePick(raw[0]);
  const b = parsePick(raw[1]);
  if (!a || !b || (a.kind === b.kind && a.slug === b.slug)) return null;
  return [a, b];
}

/**
 * Turns the routing file into a valid table, or `null` when anything is missing or malformed. All 13
 * patterns must be present exactly once, each with exactly two different picks, so a half-edited file
 * is rejected instead of silently leaving a feeling with nothing behind it.
 */
export function parseFollowUpRouting(raw: unknown): FollowUpRouting | null {
  const root = asRecord(raw);
  const follow = asRecord(root?.followUp);
  if (!root || !follow || typeof root.version !== 'number') return null;

  const options = asRecord(follow.helpMostOptions);
  const grow = asRecord(follow.growOptions);
  const expansion = asRecord(grow?.expansion);
  const participation = asRecord(grow?.participation);
  const patternQuestion = text(follow.patternQuestion);
  const helpMostQuestion = text(follow.helpMostQuestion);
  const settle = text(options?.settle, 60);
  const growLabel = text(options?.grow, 60);
  const notSureLabel = text(follow.notSureLabel, 80);
  const expansionLabel = text(expansion?.label, 80);
  const participationLabel = text(participation?.label, 80);
  const notSure = parsePair(root.notSure);
  if (
    !patternQuestion ||
    !helpMostQuestion ||
    !settle ||
    !growLabel ||
    !notSureLabel ||
    !expansionLabel ||
    !participationLabel ||
    expansion?.condition !== 'Expansion' ||
    participation?.condition !== 'Participation' ||
    !notSure
  ) {
    return null;
  }

  if (!Array.isArray(root.patterns)) return null;
  const patterns: FollowUpPatternRoute[] = [];
  for (const rawPattern of root.patterns) {
    const p = asRecord(rawPattern);
    const id = p && isProtectionPatternId(p.id) ? p.id : null;
    const group = p ? text(p.group, 20) : null;
    const pattern = p ? text(p.pattern, 80) : null;
    const memberText = p ? text(p.memberText, 120) : null;
    const picks = p ? parsePair(p.picks) : null;
    if (!id || !group || !pattern || !memberText || !picks) return null;
    if (patterns.some((x) => x.id === id)) return null;
    patterns.push({ id, group, pattern, memberText, picks });
  }
  if (patterns.length !== PROTECTION_PATTERN_IDS.length) return null;

  return {
    version: root.version,
    patternQuestion,
    helpMostQuestion,
    helpMostOptions: { settle, grow: growLabel },
    notSureLabel,
    growOptions: {
      expansion: { label: expansionLabel, condition: 'Expansion' },
      participation: { label: participationLabel, condition: 'Participation' },
    },
    notSure,
    patterns,
  };
}

/**
 * The routing table the app uses, parsed once. `null` if the file is ever invalid, in which case the
 * follow-up is simply off (callers fall back to the answer-only behaviour); the content test guards
 * the file so this cannot ship broken.
 */
export const FOLLOW_UP_ROUTING: FollowUpRouting | null = parseFollowUpRouting(routingJson);
