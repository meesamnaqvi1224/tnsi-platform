import { cn } from '@tnsi/ui';
import styles from './reset.module.css';

/**
 * Concentric, slightly irregular rings around a single point: grounding,
 * safety and presence without any figure, symbol or stock imagery. The paths are
 * computed (not stored), the same way The Return Path draws its labyrinths, so
 * they stay crisp at any size.
 */

const CENTRE = 200;
const SAMPLES = 120;

/** A closed, softly undulating loop around the centre. Deterministic: the same inputs always draw the same shape. */
function loop(radius: number, lobes: number, phase: number, amplitude: number): string {
  const points: string[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const t = (i / SAMPLES) * Math.PI * 2;
    const wobble =
      amplitude * Math.sin(lobes * t + phase) +
      amplitude * 0.45 * Math.sin((lobes + 2) * t + phase * 1.7);
    const r = radius * (1 + wobble);
    points.push(
      `${(CENTRE + r * Math.cos(t)).toFixed(1)} ${(CENTRE + r * Math.sin(t)).toFixed(1)}`,
    );
  }
  return `M${points.join('L')}Z`;
}

const INNER = [
  { r: 62, lobes: 3, phase: 0.4, amp: 0.02, opacity: 0.75 },
  { r: 94, lobes: 4, phase: 1.9, amp: 0.024, opacity: 0.55 },
] as const;

const OUTER = [
  { r: 128, lobes: 3, phase: 3.1, amp: 0.026, opacity: 0.4 },
  { r: 160, lobes: 5, phase: 0.9, amp: 0.022, opacity: 0.28 },
  { r: 190, lobes: 4, phase: 2.6, amp: 0.02, opacity: 0.18 },
] as const;

interface ResetArtProps {
  className?: string;
  /** Still and a little warmer: the completion screen, where nothing should move. */
  settled?: boolean;
}

export function ResetArt({ className, settled = false }: ResetArtProps) {
  return (
    <svg
      viewBox="0 0 400 400"
      role="img"
      aria-label="Soft concentric rings around a single point"
      className={cn('block h-auto w-full', className)}
    >
      <circle cx={CENTRE} cy={CENTRE} r={settled ? 54 : 40} fill="var(--rs-wash)" />
      <g className={settled ? undefined : styles.driftA}>
        {INNER.map((ring) => (
          <path
            key={ring.r}
            d={loop(ring.r, ring.lobes, ring.phase, ring.amp)}
            fill="none"
            stroke="var(--rs-bronze)"
            strokeWidth={1.6}
            strokeOpacity={ring.opacity}
            strokeLinejoin="round"
          />
        ))}
      </g>
      <g className={settled ? undefined : styles.driftB}>
        {OUTER.map((ring) => (
          <path
            key={ring.r}
            d={loop(ring.r, ring.lobes, ring.phase, ring.amp)}
            fill="none"
            stroke="var(--rs-bronze)"
            strokeWidth={1.4}
            strokeOpacity={ring.opacity}
            strokeLinejoin="round"
          />
        ))}
      </g>
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={7}
        fill="var(--rs-bronze)"
        className={settled ? undefined : styles.presence}
      />
    </svg>
  );
}
