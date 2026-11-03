import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * The three screens of the 90-Second Reset: the approved copy is on screen, each
 * link goes where it should, and nothing scores or rates the practice. Static
 * renders; the running clock is covered by timing.test.ts.
 */

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => undefined }) }));

const { ResetIntro } = await import('./reset-intro');
const { ResetSession } = await import('./reset-session');
const { ResetComplete } = await import('./reset-complete');
const { RESET_ROUTES } = await import('./content');
const { readFileSync } = await import('node:fs');
const readSessionSource = () =>
  readFileSync(new URL('./reset-session.tsx', import.meta.url), 'utf8');

/** The text of the page with the markup removed and curly quotes left as written. */
const textOf = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const hrefsOf = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

describe('90-Second Reset: introduction', () => {
  const html = renderToStaticMarkup(<ResetIntro />);

  it('shows the approved copy', () => {
    const text = textOf(html);
    expect(text).toContain('The Nervous System Institute');
    expect(text).toContain('Safety / PowerDrop');
    expect(text).toContain('90-Second Reset');
    expect(text).toContain('A moment to return to where you are.');
    expect(text).toContain(
      'When everything feels like too much, take a moment to pause, notice your surroundings and reconnect with the present.',
    );
    expect(text).toContain('1 min 33 sec');
    expect(text).toContain('Begin Reset');
  });

  it('opens the guided practice from Begin Reset, and has a way back to the practices', () => {
    const hrefs = hrefsOf(html);
    expect(hrefs).toContain(RESET_ROUTES.session);
    expect(hrefs).toContain(RESET_ROUTES.practices);
  });
});

describe('90-Second Reset: guided practice', () => {
  const html = renderToStaticMarkup(<ResetSession />);

  it('starts ready to play, with the whole recording still to go', () => {
    const text = textOf(html);
    expect(text).toContain('Press play when you’re ready.');
    expect(text).toContain('0:00 elapsed');
    expect(text).toContain('1:33 remaining');
    expect(html).toContain('aria-label="Play"');
  });

  it('offers an exit and the transcript, and no longer says the audio is missing', () => {
    const text = textOf(html);
    expect(text).toContain('Exit practice');
    expect(text).toContain('Transcript');
    expect(text).not.toContain('isn’t connected');
    expect(text).not.toContain('without sound');
    expect(hrefsOf(html)).toContain(RESET_ROUTES.practices);
  });

  it('plays the one real recording through a single audio element', () => {
    expect([...html.matchAll(/<audio\b/g)]).toHaveLength(1);
    expect(html).toContain('src="/audio/practices/90-second-reset.mp3"');
    expect(html).toContain('preload="auto"');
    // No built-in player: the screen's own controls drive it.
    expect(html.match(/<audio\b[^>]*>/)![0]).not.toMatch(/\bcontrols\b/);
  });

  it('is a labelled progress bar over the recording, with the five stages listed', () => {
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuemax="93"');
    for (const stage of ['Arrive', 'Orient', 'Find Support', 'Notice', 'Return']) {
      expect(html).toContain(stage);
    }
  });
});

describe('90-Second Reset: completion', () => {
  const html = renderToStaticMarkup(<ResetComplete />);
  const text = textOf(html);

  it('shows the approved copy', () => {
    expect(text).toContain('You’ve made a little space.');
    expect(text).toContain(
      'You don’t have to fix everything right now. Take what you need from this moment and move forward in your own time.',
    );
    expect(text).toContain('Practice completed');
    expect(text).toContain('1 min 33 sec');
    expect(text).toContain('Finish');
    expect(text).toContain('Return to Dashboard');
  });

  it('finishes to the practices and returns to the dashboard', () => {
    const hrefs = hrefsOf(html);
    expect(hrefs).toContain(RESET_ROUTES.practices);
    expect(hrefs).toContain(RESET_ROUTES.dashboard);
  });

  it('has no score, rating or streak language', () => {
    for (const html of [
      renderToStaticMarkup(<ResetIntro />),
      renderToStaticMarkup(<ResetSession />),
      renderToStaticMarkup(<ResetComplete />),
    ]) {
      expect(textOf(html)).not.toMatch(
        /\b(score|rating|rate|streak|points|level|congratulations)\b/i,
      );
    }
  });
});

describe('90-Second Reset: review fixes', () => {
  const screens = {
    intro: renderToStaticMarkup(<ResetIntro />),
    session: renderToStaticMarkup(<ResetSession />),
    complete: renderToStaticMarkup(<ResetComplete />),
  };

  /** The attributes of the first link or button whose visible text contains `label`. */
  const attributesOf = (html: string, label: string) => {
    for (const m of html.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
      if (textOf(m[3]!).includes(label)) return m[2];
    }
    return undefined;
  };

  it('keeps every quiet link and header control at least 44px tall', () => {
    for (const [html, label] of [
      [screens.intro, 'Back to practices'],
      [screens.session, 'Exit practice'],
      [screens.session, 'Transcript'],
      [screens.complete, 'Return to Dashboard'],
    ] as const) {
      expect(attributesOf(html, label), label).toContain('min-h-11');
    }
  });

  it('never sets a label below 12px', () => {
    for (const html of Object.values(screens)) {
      expect(html).not.toContain('text-[0.7rem]');
      expect(html).not.toContain('text-[0.68rem]');
    }
  });

  it('opens the transcript in a way that cannot hide the controls on a phone', () => {
    // Closed: neither copy is rendered. The compact copy replaces the ring, the wide copy sits under the controls.
    expect(screens.session).not.toContain('reset-transcript-compact"');
    expect(screens.session).toContain(
      'aria-controls="reset-transcript-compact reset-transcript-wide"',
    );
  });

  it('does not fade the earlier transcript lines (they are softer, not see-through)', () => {
    expect(readSessionSource()).not.toMatch(/opacity-60/);
  });
});

describe('90-Second Reset: practice principles in the screen copy', () => {
  it('keeps the playback messages calm: no pressure, no promises, no breathing instructions', async () => {
    const { RESET_COPY } = await import('./content');
    const messages = [RESET_COPY.session.audioLoading, RESET_COPY.session.audioError].join(' ');
    expect(messages).not.toMatch(
      /\b(calm|relax|breathe|breath|close your eyes|should|must|failed|wrong)\b/i,
    );
  });
});
