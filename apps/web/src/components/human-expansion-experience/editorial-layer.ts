import * as THREE from 'three';
import {
  BLOCKS,
  CONNECTORS,
  NARROW_CANVAS_RATIO,
  type BlockId,
  type ConnectorDef,
  type ConnectorTarget,
} from './editorial-config';
import { blockState } from './editorial-math';
import { activeConditionAt } from './experience-config';
import { smoothstep } from './experience-math';
import { nodeActivations, type ExperienceRuntime } from './experience-runtime';
import { bodyAt, nodePositions } from './network-geometry';
import { projectPoints, type ScreenPoint } from './project-points';

function targetToWorld(target: ConnectorTarget, nodes: THREE.Vector3[]): THREE.Vector3 {
  if (target.kind === 'node') return nodes[target.index]!.clone();
  return new THREE.Vector3(target.x, target.y, bodyAt(target.y).zc + target.z);
}

/**
 * The editorial layer of the enhanced scene: reveals the server-rendered
 * blocks as the scroll progresses, draws the fine connector lines from each
 * block to the body, and moves the chapter indicator. It works directly on
 * the DOM the server produced (it renders nothing of its own), writing a
 * handful of CSS variables and SVG path strings — never React state — and does
 * work only when the scroll progress or the layout has actually changed.
 * Returns a function that stops it.
 */
export function startEditorialLayer({
  root,
  runtimeRef,
  narrow,
}: {
  root: HTMLElement;
  runtimeRef: { readonly current: ExperienceRuntime };
  narrow: boolean;
}): () => void {
  const layer = root.querySelector<HTMLElement>('[data-he-layer]');
  if (!layer) return () => {};

  const blockEls = new Map<BlockId, HTMLElement>();
  root.querySelectorAll<HTMLElement>('[data-block]').forEach((el) => {
    blockEls.set(el.dataset.block as BlockId, el);
  });
  const pathEls = new Map<string, SVGPathElement>();
  root.querySelectorAll<SVGPathElement>('path[data-connector]').forEach((el) => {
    pathEls.set(el.dataset.connector!, el);
  });
  const chapters = root.querySelector<HTMLElement>('[data-he-chapters]');
  const chapterItems = chapters ? Array.from(chapters.querySelectorAll('li')) : [];
  const listEl = blockEls.get('conditions-list');
  const conditionItems = listEl
    ? Array.from(listEl.querySelectorAll<HTMLElement>('[data-cond-item]'))
    : [];

  const nodes = nodePositions();
  const worldPoints = CONNECTORS.map((c) => targetToWorld(c.target, nodes));

  let screen: ScreenPoint[] = [];
  // Work happens only when the scroll progress has moved or the layout changed.
  let dirty = true;
  let lastProgress = -1;
  const measure = () => {
    const { width, height } = layer.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    screen = projectPoints(worldPoints, width, narrow ? height * NARROW_CANVAS_RATIO : height);
    dirty = true;
  };
  measure();
  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(layer);

  const lastVars = new Map<string, string>();
  const setVar = (el: HTMLElement, key: string, value: number, id: string) => {
    const text = value.toFixed(3);
    const cacheKey = `${id}:${key}`;
    if (lastVars.get(cacheKey) === text) return;
    lastVars.set(cacheKey, text);
    el.style.setProperty(key, text);
  };
  const lastPath = new Map<string, string>();
  // Links inside a block that cannot be seen are taken out of the tab order.
  const linkHidden = new Map<BlockId, boolean>();
  let lastChapter = -2;

  let frame = 0;
  const tick = () => {
    frame = requestAnimationFrame(tick);
    const progress = runtimeRef.current.progress;
    if (!dirty && Math.abs(progress - lastProgress) < 1e-5) return;
    dirty = false;
    lastProgress = progress;

    // Pure calculation first.
    const states = new Map(BLOCKS.map((def) => [def.id, blockState(progress, def, narrow)]));
    const activations = nodeActivations(progress);
    const strengthOf = (def: ConnectorDef) => {
      const state = states.get(def.blockId);
      return def.conditionIndex === undefined
        ? (state?.active ?? 0)
        : (activations[def.conditionIndex]?.active ?? 0) * (state?.visibility ?? 0);
    };

    // Then every layout read, together, before any write: one reflow, not many.
    const layerRect = layer.getBoundingClientRect();
    const rects = new Map<string, DOMRect>();
    for (const def of CONNECTORS) {
      if (strengthOf(def) < 0.01) continue;
      const anchor =
        def.conditionIndex === undefined
          ? blockEls.get(def.blockId)?.querySelector<HTMLElement>('[data-anchor]')
          : conditionItems[def.conditionIndex]?.querySelector<HTMLElement>('[data-cond-anchor]');
      if (anchor) rects.set(def.id, anchor.getBoundingClientRect());
    }

    // Writes.
    for (const def of BLOCKS) {
      const state = states.get(def.id)!;
      const el = blockEls.get(def.id);
      if (!el) continue;
      setVar(el, '--vis', state.visibility, def.id);
      setVar(el, '--reveal', state.reveal, def.id);
      const hidden = state.visibility < 0.05;
      if (linkHidden.get(def.id) !== hidden) {
        linkHidden.set(def.id, hidden);
        el.querySelectorAll('a').forEach((a) => {
          a.tabIndex = hidden ? -1 : 0;
          a.style.pointerEvents = hidden ? 'none' : 'auto';
        });
      }
      // The phone shows a long block in parts, one after another, in the same place.
      if (def.narrowParts) {
        el.querySelectorAll<HTMLElement>('[data-part]').forEach((partEl) => {
          const part = def.narrowParts![Number(partEl.dataset.part)];
          if (!narrow || !part) {
            if (lastVars.delete(`${def.id}:${partEl.dataset.part}:--part`)) {
              partEl.style.removeProperty('--part');
            }
            return;
          }
          const partState = blockState(progress, { ...def, narrowWindow: part }, true);
          setVar(partEl, '--part', partState.visibility, `${def.id}:${partEl.dataset.part}`);
        });
      }
    }
    conditionItems.forEach((item, i) => {
      const a = activations[i];
      if (!a) return;
      setVar(item, '--a', a.active, `cond${i}`);
      setVar(item, '--lit', Math.min(1, (a.lit - 0.16) / 0.84), `cond${i}`);
    });

    // The chapter indicator: present through the conditions, current one lit.
    if (chapters) {
      const shown = smoothstep(0.28, 0.31, progress) * (1 - smoothstep(0.56, 0.6, progress));
      setVar(chapters, '--he-chapters', shown, 'chapters');
      const current = activeConditionAt(progress);
      if (current !== lastChapter) {
        lastChapter = current;
        chapterItems.forEach((li, i) => {
          if (i === current) li.setAttribute('data-on', '');
          else li.removeAttribute('data-on');
        });
      }
    }

    CONNECTORS.forEach((def, index) => {
      const path = pathEls.get(def.id);
      const target = screen[index];
      if (!path || !target) return;
      const strength = strengthOf(def);
      const rect = rects.get(def.id);
      if (strength < 0.01 || !rect) {
        if (path.style.opacity !== '0') path.style.opacity = '0';
        return;
      }

      const side = BLOCKS.find((b) => b.id === def.blockId)?.side ?? 'left';
      let d: string;
      if (narrow) {
        const ax = rect.left - layerRect.left - 12;
        const ay = rect.top - layerRect.top - 10;
        d = `M ${ax.toFixed(1)} ${ay.toFixed(1)} L ${ax.toFixed(1)} ${target.y.toFixed(1)} L ${target.x.toFixed(1)} ${target.y.toFixed(1)}`;
      } else {
        const ay = rect.top + rect.height / 2 - layerRect.top;
        const ax =
          side === 'left' ? rect.right - layerRect.left + 18 : rect.left - layerRect.left - 18;
        const bend = side === 'left' ? target.x - 64 : target.x + 64;
        d = `M ${ax.toFixed(1)} ${ay.toFixed(1)} L ${bend.toFixed(1)} ${ay.toFixed(1)} L ${target.x.toFixed(1)} ${target.y.toFixed(1)}`;
      }
      if (lastPath.get(def.id) !== d) {
        lastPath.set(def.id, d);
        path.setAttribute('d', d);
      }
      path.style.opacity = String(Math.min(1, strength * 1.4) * 0.85);
      path.style.strokeDashoffset = String(1 - Math.min(1, strength * 1.15));
    });
  };
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
  };
}
