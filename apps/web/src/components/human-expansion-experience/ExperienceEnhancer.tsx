'use client';

import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';
import { trackChapters } from './chapter-tracker';
import { NARROW_BREAKPOINT } from './editorial-config';
import { startEditorialLayer } from './editorial-layer';
import { EXPERIENCE_STATES, activeConditionAt, stateIndexAt } from './experience-config';
import { clamp01 } from './experience-math';
import { createRuntime, stepRuntime, type ExperienceRuntime } from './experience-runtime';
import type { NetworkQuality } from './network-geometry';

// Three.js is only fetched when the scene is actually going to run.
const ExperienceScene = lazy(() =>
  import('./ExperienceScene').then((m) => ({ default: m.ExperienceScene })),
);

const { developmentalConditions } = humanExpansionTheoryContent;

const ROOT = '[data-he-root]';
const SCENE_TARGET = 0.12; // where "Why a New Framework?" begins

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    // Release the probe's context straight away: browsers cap how many may be live.
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Mobile and low-core devices get the simplified network (fewer pathways, a
 * lower pixel-ratio cap). Decided once, in the browser.
 */
function pickQuality(): NetworkQuality {
  const small = window.matchMedia('(max-width: 767px)').matches;
  const modest = (navigator.hardwareConcurrency ?? 8) <= 4;
  return small || modest ? 'low' : 'high';
}

/** If the live scene fails after start-up, tell the page so it can fall back to the static composition. */
class SceneErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Debug readout (`?debug=1`): scroll progress, current state, and the device's
 * own frame rate. Written straight into the DOM so it never re-renders React.
 */
function DebugReadout({ runtimeRef }: { runtimeRef: RefObject<ExperienceRuntime> }) {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let sum = 0;
    let worst = 0;
    let count = 0;
    let fps = '—';
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      sum += dt;
      worst = Math.max(worst, dt);
      count += 1;
      if (sum >= 500) {
        fps = `${((count * 1000) / sum).toFixed(0)} fps · avg ${(sum / count).toFixed(1)} ms · worst ${worst.toFixed(0)} ms`;
        sum = 0;
        worst = 0;
        count = 0;
      }
      const p = runtimeRef.current.progress;
      const state = EXPERIENCE_STATES[stateIndexAt(p)]!;
      const c = activeConditionAt(p);
      const name = c >= 0 ? (developmentalConditions.items[c]?.title ?? '') : '—';
      if (ref.current) {
        ref.current.textContent = `progress ${p.toFixed(3)}\nstate    ${state.id}\ncondition ${c >= 0 ? `${c + 1} · ${name}` : '—'}\nframes   ${fps}`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [runtimeRef]);
  return (
    <pre
      ref={ref}
      className="pointer-events-none absolute top-3 left-3 z-10 font-mono text-[11px] leading-5 text-white/70"
    />
  );
}

/**
 * Progressive enhancement of `HumanExpansionTheory`. The words are already on
 * the page, in the server-rendered markup; this component (browser only)
 * never renders or duplicates them. What it does:
 *
 * - Scene (WebGL available, no reduced-motion preference): confirms the scene
 *   composition, mounts the live figure into the page's canvas slot, turns
 *   scroll into progress, and runs the editorial layer over the existing
 *   elements.
 * - Otherwise (or if the scene fails, or the preference changes to reduced
 *   motion): the page stays in its static composition — a still of the
 *   figure with the text beside it — and only the chapter indicator follows
 *   the scroll, as a plain state change.
 */
export default function ExperienceEnhancer({ debug = false }: { debug?: boolean }) {
  const runtimeRef = useRef<ExperienceRuntime>(createRuntime(prefersReducedMotion()));
  const [capable] = useState(() => ({
    scene: webglAvailable() && !prefersReducedMotion(),
    quality: pickQuality(),
  }));
  // The page's canvas slot and stage are found once this component is in the page
  // (a ref callback, so it also works when arriving by client-side navigation,
  // where the markup is committed in the same pass as this component).
  const [slots, setSlots] = useState<{
    canvas: HTMLElement | null;
    stage: HTMLElement | null;
  } | null>(null);
  const findSlots = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    setSlots(
      (current) =>
        current ?? {
          canvas: document.querySelector<HTMLElement>('[data-he-canvas]'),
          stage: document.querySelector<HTMLElement>('[data-he-stage]'),
        },
    );
  }, []);
  const [downgraded, setDowngraded] = useState(false);
  const [active, setActive] = useState(false);
  const [narrow, setNarrow] = useState(
    () => window.matchMedia(`(max-width: ${NARROW_BREAKPOINT}px)`).matches,
  );
  const scene = capable.scene && !downgraded && Boolean(slots?.canvas);

  // Tell the page which composition it is in (it may have guessed otherwise before first paint).
  useEffect(() => {
    const root = document.querySelector(ROOT);
    if (!root) return;
    root.setAttribute('data-he', scene ? 'scene' : 'linear');
    root.setAttribute('data-he-ready', '');
  }, [scene]);

  // A visitor who switches reduced motion on while the page is open gets the static composition.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      runtimeRef.current.reducedMotion = query.matches;
      if (query.matches) setDowngraded(true);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // Phone-width layout: the text sits beneath the figure instead of beside it.
  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${NARROW_BREAKPOINT}px)`);
    const onChange = () => setNarrow(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // Static composition: the chapter indicator follows the text as it scrolls past.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(ROOT);
    if (scene || !root) return;
    return trackChapters(root);
  }, [scene]);

  // Scene: scroll → normalised progress. Passive listener, one rAF per frame, no React state.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(ROOT);
    const outer = root?.querySelector<HTMLElement>('[data-he-outer]');
    const stage = root?.querySelector<HTMLElement>('[data-he-stage]');
    if (!scene || !outer || !stage) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = outer.getBoundingClientRect();
      const stuckAt = parseFloat(getComputedStyle(stage).top) || 0;
      const total = rect.height - stage.offsetHeight;
      runtimeRef.current.target = total > 0 ? clamp01((stuckAt - rect.top) / total) : 0;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scene, narrow]);

  // Scene: the intro's "Explore the Theory" link scrolls to where the first chapter begins.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(ROOT);
    const outer = root?.querySelector<HTMLElement>('[data-he-outer]');
    const stage = root?.querySelector<HTMLElement>('[data-he-stage]');
    const link = root?.querySelector<HTMLAnchorElement>('a[href="#why-a-new-framework"]');
    if (!scene || !outer || !stage || !link) return;
    const onClick = (event: MouseEvent) => {
      event.preventDefault();
      const stuckAt = parseFloat(getComputedStyle(stage).top) || 0;
      const total = outer.offsetHeight - stage.offsetHeight;
      const top =
        outer.getBoundingClientRect().top + window.scrollY + SCENE_TARGET * total - stuckAt;
      window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    };
    link.addEventListener('click', onClick);
    return () => link.removeEventListener('click', onClick);
  }, [scene]);

  // Scene: ease the scroll progress toward its target. This runs on the page, not
  // inside the canvas, so the text and connectors keep working even if WebGL does not.
  useEffect(() => {
    if (!scene || !active) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      stepRuntime(runtimeRef.current, Math.min(0.1, (now - last) / 1000));
      last = now;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [scene, active]);

  // Scene: run the render loop and the editorial layer only while the stage is on
  // screen, or about to be (one screen early, so set-up happens before it is seen).
  useEffect(() => {
    const stage = slots?.stage;
    if (!scene || !stage) return;
    const observer = new IntersectionObserver(
      ([entry]) => setActive(Boolean(entry?.isIntersecting)),
      { rootMargin: '100% 0px 100% 0px' },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, [scene, slots?.stage]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(ROOT);
    if (!scene || !active || !root) return;
    return startEditorialLayer({ root, runtimeRef, narrow });
  }, [scene, active, narrow]);

  return (
    <>
      <span hidden ref={findSlots} />
      {scene && slots?.canvas
        ? createPortal(
            <SceneErrorBoundary onError={() => setDowngraded(true)}>
              <Suspense fallback={null}>
                <ExperienceScene
                  runtimeRef={runtimeRef}
                  quality={capable.quality}
                  active={active}
                />
              </Suspense>
            </SceneErrorBoundary>,
            slots.canvas,
          )
        : null}
      {scene && debug && slots?.stage
        ? createPortal(<DebugReadout runtimeRef={runtimeRef} />, slots.stage)
        : null}
    </>
  );
}
