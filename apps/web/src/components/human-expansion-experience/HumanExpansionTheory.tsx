import type * as React from 'react';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';
import { BLOCK_COMPONENTS } from './editorial-blocks';
import { BLOCKS, CONNECTORS, NARROW_CANVAS_RATIO } from './editorial-config';
import { PALETTE } from './experience-config';
import './human-expansion.css';

/**
 * Where the still render of the figure lives. It sits under `/models` with the
 * 3D model it comes from, and is AVIF on purpose: the middleware matcher skips
 * common image extensions (`.webp`, `.png`, `.jpg`…), which would leave the
 * still publicly downloadable while the model is gated. A test guards this.
 */
export const FIGURE_STILL = {
  src: '/models/human-expansion/figure-still.avif',
  width: 1000,
  height: 1400,
};

const FIGURE_STILL_ALT =
  'A softly translucent, sculptural human figure, with a fine luminous network running through the body and five points of light along its central axis.';

/**
 * Chosen before first paint, so the page never flashes the wrong layout: the
 * enhanced (scrolling 3D) layout only when this browser can draw WebGL and the
 * visitor has not asked for reduced motion. Anything else — no JavaScript, no
 * WebGL, reduced motion, or the enhancement failing to start within a few
 * seconds — keeps the plain, complete, static layout. The component that does
 * the enhancing confirms or corrects this once it has loaded.
 */
const EARLY_MODE_SCRIPT = `(function(){try{var r=document.currentScript.parentElement;var c=document.createElement('canvas');var gl=c.getContext('webgl2')||c.getContext('webgl');var rm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(gl){var x=gl.getExtension('WEBGL_lose_context');if(x)x.loseContext();}if(gl&&!rm){r.setAttribute('data-he','scene');setTimeout(function(){if(!r.hasAttribute('data-he-ready'))r.setAttribute('data-he','linear');},12000);}}catch(e){}})();`;

const conditions = humanExpansionTheoryContent.developmentalConditions.items;

/**
 * The five conditions as a quiet index: a numeral and the condition's own name,
 * set small in the margin of the figure. Decorative (the same names are in the
 * text), not interactive; the active one answers to scroll position.
 */
function ChapterIndicator() {
  return (
    <ol className="he-chapters" data-he-chapters aria-hidden>
      {conditions.map((item, i) => (
        <li key={item.title}>
          <span className="he-chapter-n">{String(i + 1).padStart(2, '0')}</span>
          <span className="he-chapter-name">{item.title}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The complete Human Expansion Theory™ content, rendered on the server. This
 * is the page's only copy of the words: it is in the initial HTML for search,
 * assistive technology and visitors without JavaScript, and `ExperienceEnhancer`
 * (loaded separately, in the browser) turns the same elements into the
 * scrolling 3D scene — it never replaces or duplicates them.
 *
 * Two compositions share this markup, switched by `data-he` on the root:
 * - linear (default): the figure as a still, text in editorial columns beside
 *   it (stacked on a phone). No motion of any kind.
 * - scene: a sticky stage with the live figure and the text revealed by scroll.
 */
export function HumanExpansionTheory() {
  const vars = {
    '--he-bg': PALETTE.background,
    '--he-line': PALETTE.line,
    '--he-ratio': NARROW_CANVAS_RATIO,
    '--he-rows': BLOCKS.length,
  } as React.CSSProperties;

  return (
    <div className="he-root" data-he="linear" data-he-root suppressHydrationWarning style={vars}>
      <script dangerouslySetInnerHTML={{ __html: EARLY_MODE_SCRIPT }} />
      <div className="he-outer" data-he-outer>
        <div className="he-stage" data-he-stage>
          <div className="he-canvas" data-he-canvas aria-hidden />
          <div className="he-layer" data-he-layer>
            <div className="he-figure-col">
              {/* A plain <img>: the still lives under /models (gated with the model), which the image optimiser cannot fetch. */}
              <img
                className="he-figure"
                src={FIGURE_STILL.src}
                width={FIGURE_STILL.width}
                height={FIGURE_STILL.height}
                alt={FIGURE_STILL_ALT}
                decoding="async"
              />
              <ChapterIndicator />
            </div>
            <svg className="he-connectors" aria-hidden>
              {CONNECTORS.map((def) => (
                <path
                  key={def.id}
                  data-connector={def.id}
                  fill="none"
                  stroke="var(--he-line)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1}
                  style={{ opacity: 0 }}
                />
              ))}
            </svg>
            {BLOCKS.map((def, i) => {
              const Block = BLOCK_COMPONENTS[def.id];
              return (
                <div
                  key={def.id}
                  className="he-block"
                  data-block={def.id}
                  data-side={def.side}
                  id={def.id === 'why' ? 'why-a-new-framework' : undefined}
                  style={{ '--he-y': def.y, '--he-row': i + 1 } as React.CSSProperties}
                >
                  <Block />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
