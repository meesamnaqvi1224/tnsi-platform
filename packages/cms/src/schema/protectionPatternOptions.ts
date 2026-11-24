import { defineField } from 'sanity';

/**
 * The 13 protection patterns offered on content documents, in the order agreed in the TNSI content
 * workbook (Collections tab). These are the team's names and are never shown to members; the plain
 * words a member sees live in `content/checkin-suggestions-v1.json`. The ids must match
 * `PROTECTION_PATTERN_IDS` in `@tnsi/core` (a test in core checks this).
 */
export const PROTECTION_PATTERN_OPTIONS = [
  { title: 'Protective Anger and Reactivity', value: 'protective-anger-reactivity' },
  { title: 'Control and Over-Management', value: 'control-over-management' },
  { title: 'Injustice and Defensive Bracing', value: 'injustice-defensive-bracing' },
  { title: 'Functional Overdrive', value: 'functional-overdrive' },
  { title: 'Hypervigilance', value: 'hypervigilance' },
  {
    title: 'Relational Threat and Social Withdrawal',
    value: 'relational-threat-social-withdrawal',
  },
  { title: 'Functional Freeze', value: 'functional-freeze' },
  { title: 'Disconnection and Numbing', value: 'disconnection-numbing' },
  { title: 'Capacity Overload', value: 'capacity-overload' },
  { title: 'Appeasement and Boundary Loss', value: 'appeasement-boundary-loss' },
  {
    title: 'Emotional Absorption and Over-Responsibility',
    value: 'emotional-absorption-over-responsibility',
  },
  { title: 'Self-Silencing and Approval-Seeking', value: 'self-silencing-approval-seeking' },
  {
    title: 'Visceral Alarm and Gut-Focused Distress',
    value: 'visceral-alarm-gut-focused-distress',
  },
] as const;

export const protectionPatternsField = defineField({
  name: 'protectionPatterns',
  title: 'Protection patterns (check-in)',
  type: 'array',
  of: [{ type: 'string' }],
  description:
    'Which feelings this practice helps with, for the daily check-in follow-up question. The FIRST is the main pattern; add up to three others. Draft tags: they are not used by the app yet. Not a diagnosis.',
  options: {
    list: PROTECTION_PATTERN_OPTIONS.map((o) => ({ title: o.title, value: o.value })),
  },
  validation: (r) => r.unique().max(4),
});
