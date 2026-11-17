import { cn } from '@tnsi/ui';
import styles from '../ninety-second-reset/reset.module.css';

/**
 * An empty chair, drawn as a few fine lines and nothing else: a high back, a seat,
 * four legs, with soft rings of space around it and a single point of presence
 * above the seat. No figure, no stock imagery. The strokes are plain geometry so they
 * stay crisp at any size.
 */

interface ChairArtProps {
  className?: string;
  /** Still and a little warmer: the completion screen, where nothing should move. */
  settled?: boolean;
}

export function ChairArt({ className, settled = false }: ChairArtProps) {
  return (
    <svg
      viewBox="0 0 400 400"
      role="img"
      aria-label="A simple line drawing of an empty chair in soft space"
      className={cn('block h-auto w-full', className)}
    >
      <g
        fill="none"
        stroke="var(--rs-bronze)"
        strokeLinecap="round"
        className={settled ? undefined : styles.driftA}
        style={{ transformOrigin: '200px 210px' }}
      >
        <circle cx={200} cy={210} r={186} strokeWidth={1.2} strokeOpacity={0.18} />
        <circle cx={200} cy={210} r={150} strokeWidth={1.3} strokeOpacity={0.28} />
        <circle cx={200} cy={210} r={114} strokeWidth={1.4} strokeOpacity={0.4} />
      </g>
      <ellipse cx={200} cy={318} rx={92} ry={12} fill="var(--rs-wash)" />
      <g
        fill="none"
        stroke="var(--rs-bronze)"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* The back, rising from the rear of the seat. */}
        <path d="M156 296 L150 128 Q150 112 166 112 L234 112 Q250 112 250 128 L244 296" />
        <path d="M162 150 L238 150" strokeOpacity={0.55} strokeWidth={1.6} />
        {/* The seat. */}
        <path d="M138 236 Q200 228 262 236" />
        <path d="M138 236 L146 248 L254 248 L262 236" strokeOpacity={0.7} strokeWidth={1.8} />
        {/* The legs. */}
        <path d="M150 248 L144 320" />
        <path d="M250 248 L256 320" />
        <path d="M176 248 L172 312" strokeOpacity={0.5} strokeWidth={1.6} />
        <path d="M224 248 L228 312" strokeOpacity={0.5} strokeWidth={1.6} />
      </g>
      <circle
        cx={200}
        cy={196}
        r={6}
        fill="var(--rs-bronze)"
        className={settled ? undefined : styles.presence}
        style={{ transformOrigin: '200px 196px' }}
      />
    </svg>
  );
}
