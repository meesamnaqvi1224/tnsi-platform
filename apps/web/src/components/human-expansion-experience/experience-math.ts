export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** 0 → 1 → 0 across [start, end], easing in and out over `fade` at each side. */
export function pulseWindow(x: number, start: number, end: number, fade: number): number {
  return smoothstep(start - fade, start + fade, x) * (1 - smoothstep(end - fade, end + fade, x));
}

/** Deterministic PRNG so the procedural network is identical on every load. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Linear interpolation over a sorted-by-first-column table. Clamps at both ends. */
export function sampleTable(
  table: ReadonlyArray<readonly number[]>,
  y: number,
  column: number,
): number {
  const first = table[0];
  const last = table[table.length - 1];
  if (!first || !last) return 0;
  if (y <= first[0]!) return first[column]!;
  if (y >= last[0]!) return last[column]!;
  for (let i = 1; i < table.length; i += 1) {
    const b = table[i]!;
    if (y <= b[0]!) {
      const a = table[i - 1]!;
      const t = (y - a[0]!) / (b[0]! - a[0]!);
      return a[column]! + (b[column]! - a[column]!) * t;
    }
  }
  return last[column]!;
}
