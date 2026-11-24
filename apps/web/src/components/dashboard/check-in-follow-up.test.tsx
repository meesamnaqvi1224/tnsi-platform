import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FOLLOW_UP_ROUTING } from '@tnsi/core';

/**
 * The follow-up question on the website. A server render cannot click, so these check what each first
 * answer shows (the wording and the options come from `@tnsi/core`), that no team-only name reaches
 * the member, and the behaviours that need a browser (focus, Back, Skip) in the source. The flow rules
 * themselves are tested in `@tnsi/core`.
 */

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined }) }));

const { CheckInFollowUp } = await import('./check-in-follow-up');
const { CheckInForm } = await import('./check-in-form');
const { readFileSync } = await import('node:fs');
const source = readFileSync(new URL('./check-in-follow-up.tsx', import.meta.url), 'utf8');
const formSource = readFileSync(new URL('./check-in-form.tsx', import.meta.url), 'utf8');

const noop = () => undefined;
const render = (capacity: number, error: string | null = null) =>
  renderToStaticMarkup(
    <CheckInFollowUp
      capacity={capacity}
      disabled={false}
      error={error}
      onDone={noop}
      onSkip={noop}
      onExit={noop}
    />,
  );

describe('what each first answer shows', () => {
  it('answers 1 and 2: the 13 feelings and "not sure"', () => {
    for (const capacity of [1, 2]) {
      const html = render(capacity);
      expect(html).toContain('What does it feel like right now?');
      for (const p of FOLLOW_UP_ROUTING!.patterns) {
        expect(html).toContain(p.memberText.replace(/'/g, '&#x27;'));
      }
      expect(html).toContain('Not sure, just suggest something');
    }
  });

  it('answer 3: settle or grow', () => {
    const html = render(3);
    expect(html).toContain('What would help most today?');
    expect(html).toContain('Help me settle');
    expect(html).toContain('Help me grow');
  });

  it('answers 4 and 5: the two growth choices', () => {
    for (const capacity of [4, 5]) {
      const html = render(capacity);
      expect(html).toContain('Help me grow');
      expect(html).toContain('Explore what’s possible now');
      expect(html).toContain('Show up more fully in my life');
    }
  });

  it('always offers Back and Skip, and says there are no right answers', () => {
    const html = render(2);
    expect(html).toContain('>Back<');
    expect(html).toContain('>Skip this question<');
    expect(html).toContain('There are no right answers');
  });

  it('never shows a team-only pattern name or id', () => {
    const html = render(2);
    for (const p of FOLLOW_UP_ROUTING!.patterns) {
      expect(html).not.toContain(p.pattern);
      expect(html).not.toContain(p.id);
    }
  });

  it('shows a save error above the question', () => {
    expect(render(2, 'We could not save')).toContain('We could not save');
  });
});

describe('behaviour that needs a browser', () => {
  it('moves focus to each new question', () => {
    expect(source).toMatch(/headingRef\.current\?\.focus\(\)/);
    expect(source).toContain('tabIndex={-1}');
  });

  it('goes back one question, and out to the answers from the first', () => {
    expect(source).toMatch(
      /canGoBackInFollowUp\(flow\)[\s\S]{0,80}backInFollowUp\(flow\)[\s\S]{0,40}onExit\(\)/,
    );
  });

  it('holds no routing rules of its own: it asks the shared flow', () => {
    expect(source).toContain('chooseInFollowUp');
    expect(source).not.toMatch(/path:\s*'(pattern|grow|unsure)'/);
  });
});

describe('the check-in form around it', () => {
  const html = (followUpEnabled?: boolean) =>
    renderToStaticMarkup(
      followUpEnabled === undefined ? (
        <CheckInForm />
      ) : (
        <CheckInForm followUpEnabled={followUpEnabled} />
      ),
    );

  it('is exactly the old form while the follow-up is off (the default)', () => {
    for (const markup of [html(), html(false)]) {
      expect(markup).toContain('Save Check-In');
      expect(markup).not.toContain('>Continue<');
    }
  });

  it('asks for the follow-up before saving when it is on', () => {
    const markup = html(true);
    expect(markup).toContain('>Continue<');
    expect(markup).not.toContain('Save Check-In');
  });

  it('saves once, with the answer, and only after the questions', () => {
    expect(formSource).toMatch(/async function save\(followUp: FollowUp \| null\)/);
    expect(formSource).toMatch(/browserTimeZone\(\),\s*followUp,/);
    expect(formSource).toMatch(/setStage\('followUp'\);\s*return;/);
  });
});
