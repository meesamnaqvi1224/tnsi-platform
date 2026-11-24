/**
 * The question flow of the check-in follow-up, as pure data and transitions: which question comes
 * next, what the options are and what each choice does. The website and the app both draw this same
 * flow, so they cannot disagree about it, and the screens hold no routing rules of their own.
 *
 * The flow (decided by Caroline, 23 Nov 2026):
 *   answers 1 and 2  -> "What does it feel like right now?" (13 feelings, or "not sure")
 *   answer 3         -> "What would help most today?" -> Help me settle (feelings) or Help me grow
 *   answers 4 and 5  -> Help me grow
 * Help me grow is one more choice: Expansion or Participation.
 *
 * A member can always go back one step. Nothing here is a score and no clinical word is ever a label.
 */
import { FOLLOW_UP_VERSION, type FollowUp } from './follow-up';
import type { FollowUpRouting, ProtectionPatternId } from './follow-up-routing';

export type FollowUpStep = 'helpMost' | 'pattern' | 'grow';

export type FollowUpChoice =
  | { type: 'help'; value: 'settle' | 'grow' }
  | { type: 'pattern'; id: ProtectionPatternId }
  | { type: 'unsure' }
  | { type: 'grow'; area: 'expansion' | 'participation' };

/** Where the member is: the questions they have moved through, last = the one on screen. */
export type FollowUpFlowState = { stack: readonly FollowUpStep[] };

/** The first question for a first answer of 1 to 5, or `null` for anything else. */
export function firstFollowUpStep(capacityScore: number): FollowUpStep | null {
  if (!Number.isInteger(capacityScore) || capacityScore < 1 || capacityScore > 5) return null;
  if (capacityScore <= 2) return 'pattern';
  if (capacityScore === 3) return 'helpMost';
  return 'grow';
}

export function startFollowUp(capacityScore: number): FollowUpFlowState | null {
  const first = firstFollowUpStep(capacityScore);
  return first ? { stack: [first] } : null;
}

export const currentFollowUpStep = (state: FollowUpFlowState): FollowUpStep =>
  state.stack[state.stack.length - 1]!;

/** Whether Back goes to an earlier question (otherwise it returns to the first check-in answer). */
export const canGoBackInFollowUp = (state: FollowUpFlowState): boolean => state.stack.length > 1;

export function backInFollowUp(state: FollowUpFlowState): FollowUpFlowState {
  return canGoBackInFollowUp(state) ? { stack: state.stack.slice(0, -1) } : state;
}

export type FollowUpAdvance =
  { done: false; state: FollowUpFlowState } | { done: true; followUp: FollowUp };

/**
 * Applies a choice made on the current question. A choice that does not belong to that question is
 * ignored (the same state comes back), so a stray tap can never produce a wrong answer.
 */
export function chooseInFollowUp(
  state: FollowUpFlowState,
  choice: FollowUpChoice,
): FollowUpAdvance {
  const step = currentFollowUpStep(state);
  if (step === 'helpMost' && choice.type === 'help') {
    return {
      done: false,
      state: { stack: [...state.stack, choice.value === 'settle' ? 'pattern' : 'grow'] },
    };
  }
  if (step === 'pattern' && choice.type === 'pattern') {
    return { done: true, followUp: { v: FOLLOW_UP_VERSION, path: 'pattern', pattern: choice.id } };
  }
  if (step === 'pattern' && choice.type === 'unsure') {
    return { done: true, followUp: { v: FOLLOW_UP_VERSION, path: 'unsure' } };
  }
  if (step === 'grow' && choice.type === 'grow') {
    return {
      done: true,
      followUp: { v: FOLLOW_UP_VERSION, path: 'grow', growArea: choice.area },
    };
  }
  return { done: false, state };
}

export type FollowUpOption = { key: string; label: string; choice: FollowUpChoice };

export type FollowUpScreen = {
  step: FollowUpStep;
  /** The question or screen heading. */
  heading: string;
  /** The choices, in order. */
  options: FollowUpOption[];
  /** A separate "not sure" option shown after the list (the feelings screen only). */
  notSure: FollowUpOption | null;
};

/** What to draw for a question, from the routing table's own wording. */
export function followUpScreen(routing: FollowUpRouting, step: FollowUpStep): FollowUpScreen {
  if (step === 'helpMost') {
    return {
      step,
      heading: routing.helpMostQuestion,
      options: [
        {
          key: 'settle',
          label: routing.helpMostOptions.settle,
          choice: { type: 'help', value: 'settle' },
        },
        {
          key: 'grow',
          label: routing.helpMostOptions.grow,
          choice: { type: 'help', value: 'grow' },
        },
      ],
      notSure: null,
    };
  }
  if (step === 'pattern') {
    return {
      step,
      heading: routing.patternQuestion,
      options: routing.patterns.map((p) => ({
        key: p.id,
        label: p.memberText,
        choice: { type: 'pattern', id: p.id },
      })),
      notSure: { key: 'unsure', label: routing.notSureLabel, choice: { type: 'unsure' } },
    };
  }
  return {
    step,
    heading: routing.helpMostOptions.grow,
    options: [
      {
        key: 'expansion',
        label: routing.growOptions.expansion.label,
        choice: { type: 'grow', area: 'expansion' },
      },
      {
        key: 'participation',
        label: routing.growOptions.participation.label,
        choice: { type: 'grow', area: 'participation' },
      },
    ],
    notSure: null,
  };
}
