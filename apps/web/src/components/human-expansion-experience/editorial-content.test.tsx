import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { humanExpansionTheoryContent as c } from '@/content/human-expansion-theory';
import fs from 'node:fs';
import path from 'node:path';
import { BLOCKS, CONNECTORS, NARROW_BREAKPOINT } from './editorial-config';
import { PALETTE } from './experience-config';
import { FIGURE_STILL, HumanExpansionTheory } from './HumanExpansionTheory';

/** Escapes text the way React does, so strings with ’ & " compare like-for-like. */
const escape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

/** Visible copy only: links and the chapter numerals (a label of the long page, not copy) are skipped. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') {
    for (const [key, v] of Object.entries(value))
      if (key !== 'href' && key !== 'chapter') strings(v, out);
  }
  return out;
}

describe('server-rendered Human Expansion Theory content', () => {
  const html = renderToStaticMarkup(<HumanExpansionTheory />);
  const count = (needle: string) => html.split(needle).length - 1;

  it('has every word of the existing sections, unaltered, in the initial HTML', () => {
    const sections = [
      // hero.paragraphs is not rendered by the live /method page either (its hero
      // is eyebrow + headline + tagline + CTA), so it is not part of this scene.
      { ...c.hero, paragraphs: [] },
      c.whyNewFramework,
      c.centralProposition,
      c.developmentalConditions,
      c.protectionParticipation,
      c.theoryToPractice,
      c.evolving,
    ];
    for (const text of strings(sections)) expect(html, text).toContain(escape(text));
  });

  it('has each passage once, not duplicated for another layout', () => {
    const sections = [
      c.whyNewFramework,
      c.centralProposition,
      c.developmentalConditions,
      c.protectionParticipation,
      c.theoryToPractice,
      c.evolving,
    ];
    for (const text of strings(sections).filter((t) => t.length > 40)) {
      expect(count(escape(text)), text).toBe(1);
    }
  });

  it('keeps the blocks in reading order, once each', () => {
    const positions = BLOCKS.map((b) => html.indexOf(`data-block="${b.id}"`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    BLOCKS.forEach((b) => expect(count(`data-block="${b.id}"`)).toBe(1));
  });

  it('keeps the five conditions in the existing order', () => {
    const positions = c.developmentalConditions.items.map((i) =>
      html.indexOf(`data-cond-anchor`) >= 0 ? html.indexOf(`>${escape(i.title)}</h3>`) : -1,
    );
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('lists each pathway once, in one list', () => {
    for (const p of c.theoryToPractice.pathways) {
      expect(count(escape(p.description))).toBe(1);
    }
    expect(count('class="he-pathways')).toBe(1);
  });

  it('starts in the static composition, so it is complete without JavaScript, WebGL or motion', () => {
    expect(html).toContain('data-he="linear"');
    expect(html).toContain(`src="${FIGURE_STILL.src}"`);
    expect(html).toMatch(/alt="[^"]{40,}"/);
    expect(html).toContain('<script>');
  });

  it('has a chapter indicator with the exact condition names, numbered 01–05', () => {
    const indicator = html.slice(html.indexOf('data-he-chapters'), html.indexOf('</ol>'));
    c.developmentalConditions.items.forEach((item, i) => {
      expect(indicator).toContain(`>${String(i + 1).padStart(2, '0')}</span>`);
      expect(indicator).toContain(`>${escape(item.title)}</span>`);
    });
    expect(indicator).toContain('aria-hidden');
  });

  it('carries every connector line as a path for the scene to draw', () => {
    CONNECTORS.forEach((def) => expect(count(`data-connector="${def.id}"`)).toBe(1));
  });

  it('links the intro to a target that exists', () => {
    expect(html).toContain(`href="${c.hero.cta.href}"`);
    expect(html).toContain(`id="${c.hero.cta.href.slice(1)}"`);
  });
});

describe('model files stay behind the review gate', () => {
  it('serves the still from an extension the middleware matcher does not skip', () => {
    const middleware = fs.readFileSync(path.join(__dirname, '../../middleware.ts'), 'utf8');
    const skip = middleware.match(/\(\?!_next\|\[\^\?\]\*\\\\\.\(\?:([^)]*)\)/)?.[1];
    expect(skip, 'could not read the matcher').toBeTruthy();
    const ext = FIGURE_STILL.src.split('.').pop()!;
    expect(
      skip!.split('|').map((e) => e.replace(/\(\?!on\)|\?/g, '')),
      ext,
    ).not.toContain(ext);
    expect(FIGURE_STILL.src.startsWith('/models/')).toBe(true);
  });
});

describe('stylesheet', () => {
  const css = fs.readFileSync(path.join(__dirname, 'human-expansion.css'), 'utf8');

  it('switches layouts at the same width as the scene logic', () => {
    expect(css).toContain(`(max-width: ${NARROW_BREAKPOINT}px)`);
    expect(css).toContain(`(min-width: ${NARROW_BREAKPOINT + 1}px)`);
  });

  it('uses the scene’s dark ground in the bands either side of it', () => {
    expect(css.toLowerCase()).toContain(PALETTE.background.toLowerCase());
  });

  it('has no animation outside a no-preference media query', () => {
    const withoutAllowed = css.replace(
      /@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}\n/g,
      '',
    );
    expect(withoutAllowed).not.toMatch(/\btransition\s*:/);
    expect(withoutAllowed).not.toMatch(/\banimation\s*:/);
  });
});
