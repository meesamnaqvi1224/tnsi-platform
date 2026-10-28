import {
  buildCheckpoints,
  followPointer,
  geometryFor,
  grabRadius,
  headPoint,
  type Checkpoint,
  type LabyrinthGeometry,
  type LevelId,
  type Point,
} from '@tnsi/core';

/**
 * The state of one run of The Return Path, with no React Native and no timers,
 * so the rules that decide "does this touch move the practice on?" are unit
 * tested. It is the native counterpart of the web component's mutable refs
 * (`pRef`, `nextRef`, `phaseRef`, `markerCountRef`); the labyrinth maths itself
 * is `@tnsi/core`, shared with the web app.
 *
 * Phases: `trace` (the head can move), `pause` (stopped at a marker or the
 * centre until `resume()`), `complete` (the end of the return trace).
 */
export type EnginePhase = 'trace' | 'pause' | 'complete';

export interface ReachedEvent {
  type: 'reached';
  checkpoint: Checkpoint;
  /** 1, 2, 3... for inward and return markers; 0 for the centre and the end. */
  markerNumber: number;
}

/** Progress moved by less than this is not worth re-rendering. */
const EPSILON = 0.01;

export class ReturnPathEngine {
  readonly geometry: LabyrinthGeometry;
  readonly checkpoints: Checkpoint[];
  private next = 0;
  private p = 0;
  private current: EnginePhase = 'trace';
  private markers = 0;
  private lastReached: Checkpoint | null = null;

  constructor(readonly level: LevelId) {
    this.geometry = geometryFor(level);
    this.checkpoints = buildCheckpoints(level, this.geometry);
  }

  /** 0 .. 2L: the inward trace, then the return along the same path. */
  get progress(): number {
    return this.p;
  }

  get phase(): EnginePhase {
    return this.current;
  }

  /** Fraction of the whole practice, 0..1. */
  get fraction(): number {
    return this.p / (2 * this.geometry.L);
  }

  /** On the return trace (past the centre): what the head and trace are drawn as. */
  get returning(): boolean {
    return this.p > this.geometry.L;
  }

  /**
   * The next movement runs outward. True from the moment the centre pause
   * ends, i.e. one step earlier than `returning` (the head is still exactly
   * on the centre). This is the same rule `followPointer` applies.
   */
  get movingOutward(): boolean {
    return this.p > this.geometry.L || this.lastReached?.kind === 'centre';
  }

  head(): Point {
    return headPoint(this.geometry, this.p);
  }

  /** Whether a first touch at `point` (viewBox units) is close enough to pick the head up. */
  canGrab(point: Point): boolean {
    if (this.current !== 'trace') return false;
    const head = this.head();
    return Math.hypot(point[0] - head[0], point[1] - head[1]) < grabRadius(this.geometry);
  }

  /** The pointer is at `point`: moves forward along the path if it is on the line, else does nothing. */
  follow(point: Point): ReachedEvent[] {
    const cp = this.checkpoints[this.next];
    if (this.current !== 'trace' || !cp) return [];
    const target = followPointer(this.geometry, this.p, cp.p, point);
    return target === null ? [] : this.advanceTo(target);
  }

  /** Moves to `target` (never past the next checkpoint). Used by tracing and by "Guide me". */
  advanceTo(target: number): ReachedEvent[] {
    const cp = this.checkpoints[this.next];
    if (this.current !== 'trace' || !cp) return [];
    this.p = Math.min(target, cp.p);
    if (this.p < cp.p - EPSILON) return [];

    this.next += 1;
    this.lastReached = cp;
    if (cp.kind === 'end') {
      this.current = 'complete';
      return [{ type: 'reached', checkpoint: cp, markerNumber: 0 }];
    }
    this.current = 'pause';
    if (cp.kind === 'centre') return [{ type: 'reached', checkpoint: cp, markerNumber: 0 }];
    this.markers += 1;
    return [{ type: 'reached', checkpoint: cp, markerNumber: this.markers }];
  }

  /** Ends a pause. Returns whether it was the centre pause (the next movement is outward). */
  resume(): { fromCentre: boolean } {
    const fromCentre = this.lastReached?.kind === 'centre';
    if (this.current === 'pause') this.current = 'trace';
    return { fromCentre };
  }
}
