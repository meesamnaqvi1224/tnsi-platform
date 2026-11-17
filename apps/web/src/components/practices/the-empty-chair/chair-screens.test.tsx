import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * The three screens of The Empty Chair: the approved copy is on screen, each link goes
 * where it should, the audio is wired the way the brief requires, and nothing scores or
 * rates the practice. Static renders plus checks on the source for the behaviours a
 * server render cannot run (the running clock is covered by timing.test.ts).
 */

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => undefined }) }));

const { ChairIntro } = await import('./chair-intro');
const { ChairSession } = await import('./chair-session');
const { ChairComplete } = await import('./chair-complete');
const { CHAIR_ROUTES, CHAIR_COPY } = await import('./content');
const { readFileSync } = await import('node:fs');
const source = (name: string) => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');

/** The text of the page with the markup removed and curly quotes left as written. */
const textOf = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const hrefsOf = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

const screens = {
  intro: renderToStaticMarkup(<ChairIntro />),
  session: renderToStaticMarkup(<ChairSession />),
  complete: renderToStaticMarkup(<ChairComplete />),
};

describe('The Empty Chair: routes', () => {
  it('lives under /dashboard/practices/the-empty-chair', () => {
    expect(CHAIR_ROUTES).toMatchObject({
      intro: '/dashboard/practices/the-empty-chair',
      session: '/dashboard/practices/the-empty-chair/session',
      complete: '/dashboard/practices/the-empty-chair/complete',
      practices: '/dashboard/practices',
    });
  });

  it('keeps all three pages behind the same member check as the 90-Second Reset', () => {
    for (const path of ['', 'session/', 'complete/']) {
      const page = readFileSync(
        new URL(
          `../../../app/dashboard/practices/the-empty-chair/${path}page.tsx`,
          import.meta.url,
        ),
        'utf8',
      );
      expect(page).toContain('await requireMemberAccessOrRedirect();');
      expect(page).toContain('noIndex: true');
    }
  });
});

describe('The Empty Chair: introduction', () => {
  const text = textOf(screens.intro);

  it('shows the approved copy', () => {
    expect(text).toContain('The Empty Chair');
    expect(text).toContain('Taking Your Seat in Your Own Life');
    expect(text).toContain('Participation');
    expect(text).toContain('Guided Reflection');
    expect(text).toContain('4 min 31 sec');
    expect(text).toContain(
      'A gentle end-of-day reflection to notice where you have been present in your own life and consider one ordinary moment when you might take your seat again tomorrow.',
    );
    expect(text).toContain('Begin Practice');
    expect(text).toContain('Back to Practices');
  });

  it('opens the guided session from Begin Practice, and has a way back', () => {
    const hrefs = hrefsOf(screens.intro);
    expect(hrefs).toContain(CHAIR_ROUTES.session);
    expect(hrefs).toContain(CHAIR_ROUTES.practices);
  });

  it('has one h1', () => {
    expect([...screens.intro.matchAll(/<h1\b/g)]).toHaveLength(1);
  });
});

describe('The Empty Chair: guided session', () => {
  const html = screens.session;
  const text = textOf(html);

  it('starts ready to play, with the whole recording still to go', () => {
    expect(text).toContain('Press play when you’re ready.');
    expect(text).toContain('0:00 elapsed');
    expect(text).toContain('4:31 remaining');
    expect(html).toContain('aria-label="Play"');
    expect(text).toContain('4 min 31 sec');
    expect(text).toContain('The Empty Chair');
  });

  it('offers play/pause and exit, and nothing else to press', () => {
    expect(text).toContain('Exit practice');
    expect(hrefsOf(html)).toContain(CHAIR_ROUTES.practices);
    expect([...html.matchAll(/<button\b/g)]).toHaveLength(1);
    expect(text).not.toMatch(/transcript/i);
  });

  it('plays the one real recording through a single audio element, without its own player', () => {
    expect([...html.matchAll(/<audio\b/g)]).toHaveLength(1);
    expect(html).toContain('src="/audio/practices/the-empty-chair.mp3"');
    expect(html).toContain('preload="auto"');
    expect(html.match(/<audio\b[^>]*>/)![0]).not.toMatch(/\bcontrols\b/);
  });

  it('is a labelled progress bar over the recording, with the five stages listed by name', () => {
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuemax="271"');
    for (const stage of [
      'Arriving',
      'The Empty Chair',
      'Remembering a Moment',
      'Taking Your Seat Again',
      'Closing',
    ]) {
      expect(html).toContain(stage);
    }
  });

  it('never shows the voice-over transcript', () => {
    const copy = JSON.stringify(CHAIR_COPY);
    expect(copy).not.toContain('There is nothing you need to accomplish');
    expect(copy).not.toContain('Who has been sitting in that chair');
  });
});

describe('The Empty Chair: completion', () => {
  const text = textOf(screens.complete);

  it('shows the approved copy and the optional reflection prompt', () => {
    expect(text).toContain('You Took Your Seat.');
    expect(text).toContain('Participation begins with presence. One moment at a time.');
    expect(text).toContain('What is one moment from today you want to remember?');
    expect(text).toContain('Return to Practices');
  });

  it('returns to the practices', () => {
    expect(hrefsOf(screens.complete)).toContain(CHAIR_ROUTES.practices);
  });

  it('asks for nothing: no form, field, or submit, so nothing is saved', () => {
    expect(screens.complete).not.toMatch(/<(form|input|textarea)\b/);
    expect(screens.complete).not.toMatch(/type="submit"/);
  });
});

describe('The Empty Chair: calm copy', () => {
  it('has no score, rating or streak language on any screen', () => {
    for (const html of Object.values(screens)) {
      expect(textOf(html)).not.toMatch(
        /\b(score|rating|rate|streak|points|level|congratulations)\b/i,
      );
    }
  });

  it('keeps the playback messages calm', () => {
    const messages = [CHAIR_COPY.session.audioLoading, CHAIR_COPY.session.audioError].join(' ');
    expect(messages).not.toMatch(
      /\b(calm|relax|breathe|breath|close your eyes|should|must|failed|wrong)\b/i,
    );
  });
});

describe('The Empty Chair: accessibility basics', () => {
  /** The attributes of the first link or button whose visible text contains `label`. */
  const attributesOf = (html: string, label: string) => {
    for (const m of html.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
      if (textOf(m[3]!).includes(label)) return m[2];
    }
    return undefined;
  };

  it('keeps every quiet link and the play control at least 44px tall', () => {
    expect(attributesOf(screens.intro, 'Back to Practices')).toContain('min-h-11');
    expect(attributesOf(screens.session, 'Exit practice')).toContain('min-h-11');
    // The play/pause button is size-20 (80px).
    expect(screens.session).toContain('size-20');
    expect(attributesOf(screens.intro, 'Begin Practice')).toContain('h-14');
    expect(attributesOf(screens.complete, 'Return to Practices')).toContain('h-14');
  });

  it('gives the play/pause control an accessible name and a visible focus state', () => {
    const button = screens.session.match(/<button\b[^>]*>/)![0];
    expect(button).toContain('aria-label="Play"');
    expect(button).toContain('focus-visible:ring-2');
    expect(attributesOf(screens.session, 'Exit practice')).toContain('focus-visible:ring-2');
  });

  it('announces the current cue politely, and names the stages without colour alone', () => {
    expect(screens.session).toContain('aria-live="polite"');
    expect(screens.session).toContain('aria-label="Stages"');
    // Each stage has a text name (screen-reader) and the ring shows "Stage n of 5" in words.
    expect(source('chair-session.tsx')).toContain(
      'Stage ${shownIndex + 1} of ${CHAIR_STAGES.length}',
    );
    expect(source('chair-session.tsx')).toContain(
      "aria-current={started && i === stageIndex ? 'step' : undefined}",
    );
  });

  it('describes the drawing, and keeps decorative layers hidden from assistive tech', () => {
    expect(screens.intro).toContain('role="img"');
    expect(screens.intro).toContain('aria-label="A simple line drawing of an empty chair');
    expect(screens.session).toMatch(/aria-hidden="true"/);
  });

  it('never sets a label below 12px', () => {
    for (const html of Object.values(screens)) {
      expect(html).not.toContain('text-[0.7rem]');
      expect(html).not.toContain('text-[0.68rem]');
    }
  });

  it('switches every animation off for people who ask for reduced motion', () => {
    const css = readFileSync(
      new URL('../ninety-second-reset/reset.module.css', import.meta.url),
      'utf8',
    );
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    for (const cls of ['driftA', 'presence', 'halo', 'arrive', 'leaving', 'ripple']) {
      expect(reduced).toContain(`.${cls}`);
    }
    // The stage swap itself has no delay under reduced motion.
    expect(source('chair-session.tsx')).toContain('reduce ? 0 : LEAVE_MS');
  });

  it('is built mobile-first and safe on phones: full-viewport shell, no fixed pixel widths on the page', () => {
    const shell = readFileSync(
      new URL('../ninety-second-reset/reset-shell.tsx', import.meta.url),
      'utf8',
    );
    expect(shell).toContain('fixed inset-0');
    expect(shell).toContain('min-h-dvh');
    expect(source('chair-session.tsx')).toContain('lg:grid-cols-2');
  });
});

describe('The Empty Chair: audio behaviour (the contract the running player must keep)', () => {
  const code = source('chair-session.tsx');

  it('has exactly one way to the completion screen: the audio ended event', () => {
    expect([...code.matchAll(/router\.push\(/g)]).toHaveLength(1);
    expect(code).toContain('onEnded={handleEnded}');
    expect(code).toMatch(/const handleEnded = \(\) => \{[\s\S]*router\.push\(routes\.complete\)/);
  });

  it('reads the position only from the audio element, with no independent timer for stages', () => {
    expect(code).toContain('setPosition(audio.currentTime)');
    expect(code).not.toMatch(/setInterval\(/);
    // The only timeout is the 220 ms visual swap of the words.
    expect([...code.matchAll(/setTimeout\(/g)]).toHaveLength(1);
  });

  it('keeps the display honest on seeks, pauses and returning to the tab', () => {
    expect(code).toContain('onSeeked={syncPosition}');
    expect(code).toContain('onTimeUpdate={syncPosition}');
    expect(code).toContain("document.addEventListener('visibilitychange'");
  });

  it('stops the sound and removes its listeners when the screen is left', () => {
    expect(code).toContain("window.addEventListener('pagehide'");
    expect(code).toContain("document.removeEventListener('visibilitychange'");
    expect(code).toContain("window.removeEventListener('pagehide'");
    expect(code).toMatch(/return \(\) => \{[\s\S]*audio\?\.pause\(\);/);
  });

  it('starts playback synchronously from the tap and treats an interrupted start as no failure', () => {
    expect(code).toMatch(/await audio\.play\(\)/);
    expect(code).toContain("name !== 'AbortError'");
  });

  it('shows a clear retry when the audio cannot load, and resumes from where it was', () => {
    expect(code).toContain('onError={failed}');
    expect(code).toContain('role="alert"');
    expect(code).toContain('const resumeAt = audio.currentTime;');
    expect(code).toContain('audio.currentTime = resumeAt;');
  });

  it('never creates a second audio element', () => {
    expect(code).not.toMatch(/new Audio\(/);
    expect(code).not.toMatch(/createElement\(['"]audio['"]\)/);
  });
});
