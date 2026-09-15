import { cn } from '@tnsi/ui';

interface ProgressBarProps {
  /** 0 to 1. */
  value: number;
  className?: string;
}

/**
 * A quiet visual progress indicator - paired with a small percentage label
 * by the caller rather than standing in for one. Softens the dashboard's
 * previous bare "45% complete" text into something glanceable, mirroring
 * the native app's ContinuePractiseCard treatment of the same
 * `progressPct` field (a thin fill on a muted track, not a bald number).
 */
export function ProgressBar({ value, className }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round(value * 100)));

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('bg-accent h-1 w-full overflow-hidden rounded-full', className)}
    >
      <div className="bg-foreground h-full rounded-full" style={{ width: `${pct}%` }} />
    </div>
  );
}
