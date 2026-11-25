import type { PatternConfidence } from '@tnsi/core';
import seed from '../../../../content/protection-patterns-v1.json';

type Seed = {
  somaticCards: Record<string, { confidence?: string }>;
  powerDrops: Record<string, { confidence?: string }>;
};

/**
 * How sure the team is of a card's or PowerDrop's protection-pattern tags: the Practice Tags tab's
 * "Pattern confidence", kept in `content/protection-patterns-v1.json`. The check-in follow-up uses
 * pattern tags only to fill a gap behind Caroline's named picks, and only by this rating (High always,
 * Medium only to replace a practice locked for a free member). Anything not rated is `null`, which is
 * never used.
 */
export function patternConfidenceOf(
  kind: 'somaticCard' | 'powerDrop',
  slug: string,
): PatternConfidence | null {
  const table = (seed as Seed)[kind === 'somaticCard' ? 'somaticCards' : 'powerDrops'];
  const level = Object.prototype.hasOwnProperty.call(table, slug) ? table[slug]?.confidence : null;
  return level === 'High' || level === 'Medium' || level === 'Low' ? level : null;
}
