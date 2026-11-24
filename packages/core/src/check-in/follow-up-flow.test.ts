import { describe, expect, it } from 'vitest';
import { FOLLOW_UP_ROUTING, PROTECTION_PATTERN_IDS } from './follow-up-routing';
import { followUpFitsAnswer } from './follow-up';
import {
  backInFollowUp,
  canGoBackInFollowUp,
  chooseInFollowUp,
  currentFollowUpStep,
  firstFollowUpStep,
  followUpScreen,
  startFollowUp,
  type FollowUpFlowState,
} from './follow-up-flow';

const routing = FOLLOW_UP_ROUTING!;

describe('the first question', () => {
  it('is the feelings for 1 and 2, help-most for 3, grow for 4 and 5', () => {
    expect([1, 2, 3, 4, 5].map(firstFollowUpStep)).toEqual([
      'pattern',
      'pattern',
      'helpMost',
      'grow',
      'grow',
    ]);
  });

  it('has none for an invalid answer', () => {
    for (const bad of [0, 6, 2.5, NaN]) {
      expect(firstFollowUpStep(bad)).toBeNull();
      expect(startFollowUp(bad)).toBeNull();
    }
  });
});

describe('moving through the flow', () => {
  it('answers 1 and 2: pick a feeling and finish', () => {
    const s = startFollowUp(2)!;
    const r = chooseInFollowUp(s, { type: 'pattern', id: 'hypervigilance' });
    expect(r).toEqual({
      done: true,
      followUp: { v: 1, path: 'pattern', pattern: 'hypervigilance' },
    });
  });

  it('"not sure" finishes with the unsure path', () => {
    expect(chooseInFollowUp(startFollowUp(1)!, { type: 'unsure' })).toEqual({
      done: true,
      followUp: { v: 1, path: 'unsure' },
    });
  });

  it('answer 3: settle leads to the feelings, grow leads to the grow choice', () => {
    const settle = chooseInFollowUp(startFollowUp(3)!, { type: 'help', value: 'settle' });
    expect(settle.done).toBe(false);
    if (settle.done) return;
    expect(currentFollowUpStep(settle.state)).toBe('pattern');
    const grow = chooseInFollowUp(startFollowUp(3)!, { type: 'help', value: 'grow' });
    expect(grow.done).toBe(false);
    if (grow.done) return;
    expect(currentFollowUpStep(grow.state)).toBe('grow');
    expect(chooseInFollowUp(grow.state, { type: 'grow', area: 'participation' })).toEqual({
      done: true,
      followUp: { v: 1, path: 'grow', growArea: 'participation' },
    });
  });

  it('answers 4 and 5 go straight to the grow choice', () => {
    for (const n of [4, 5]) {
      expect(currentFollowUpStep(startFollowUp(n)!)).toBe('grow');
    }
  });

  it('Back returns one question at a time and never past the first', () => {
    const first = startFollowUp(3)!;
    expect(canGoBackInFollowUp(first)).toBe(false);
    const advanced = chooseInFollowUp(first, { type: 'help', value: 'settle' });
    if (advanced.done) throw new Error('unexpected');
    expect(canGoBackInFollowUp(advanced.state)).toBe(true);
    expect(backInFollowUp(advanced.state)).toEqual(first);
    expect(backInFollowUp(first)).toEqual(first);
  });

  it('ignores a choice that does not belong to the current question', () => {
    const s: FollowUpFlowState = startFollowUp(4)!; // grow question
    for (const wrong of [
      { type: 'pattern', id: 'hypervigilance' } as const,
      { type: 'unsure' } as const,
      { type: 'help', value: 'settle' } as const,
    ]) {
      expect(chooseInFollowUp(s, wrong)).toEqual({ done: false, state: s });
    }
  });

  it('every result is accepted by the server-side rule for the answer it came from', () => {
    for (const answer of [1, 2, 3, 4, 5]) {
      const s = startFollowUp(answer)!;
      const step = currentFollowUpStep(s);
      const choice =
        step === 'pattern'
          ? ({ type: 'pattern', id: PROTECTION_PATTERN_IDS[0] } as const)
          : step === 'grow'
            ? ({ type: 'grow', area: 'expansion' } as const)
            : ({ type: 'help', value: 'settle' } as const);
      let r = chooseInFollowUp(s, choice);
      if (!r.done) {
        r = chooseInFollowUp(r.state, { type: 'pattern', id: PROTECTION_PATTERN_IDS[0] });
      }
      if (!r.done) throw new Error('flow did not finish');
      expect(followUpFitsAnswer(r.followUp, answer)).toBe(true);
    }
  });
});

describe('what each question shows', () => {
  it('the feelings screen lists all 13 in order with "not sure" separate', () => {
    const screen = followUpScreen(routing, 'pattern');
    expect(screen.heading).toBe('What does it feel like right now?');
    expect(screen.options).toHaveLength(13);
    expect(screen.options[3]!.label).toBe('I can’t switch off');
    expect(screen.notSure).toMatchObject({ label: 'Not sure, just suggest something' });
  });

  it('help-most offers settle and grow with the agreed words', () => {
    const screen = followUpScreen(routing, 'helpMost');
    expect(screen.heading).toBe('What would help most today?');
    expect(screen.options.map((o) => o.label)).toEqual(['Help me settle', 'Help me grow']);
    expect(screen.notSure).toBeNull();
  });

  it('the grow screen offers the two growth choices', () => {
    const screen = followUpScreen(routing, 'grow');
    expect(screen.heading).toBe('Help me grow');
    expect(screen.options.map((o) => o.label)).toEqual([
      'Explore what’s possible now',
      'Show up more fully in my life',
    ]);
  });

  it('never shows a team-only pattern name to the member', () => {
    const shown = followUpScreen(routing, 'pattern')
      .options.map((o) => o.label)
      .join(' | ');
    for (const p of routing.patterns) expect(shown).not.toContain(p.pattern);
  });
});
