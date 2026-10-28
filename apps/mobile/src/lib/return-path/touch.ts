import { VIEWBOX, type Point } from '@tnsi/core';

/**
 * A touch inside the square stage (`size` pixels a side) as a point in the
 * labyrinth's 400 x 400 viewBox, which is what `@tnsi/core` works in.
 */
export function touchToViewBox(x: number, y: number, size: number): Point | null {
  if (!(size > 0)) return null;
  return [(x / size) * VIEWBOX, (y / size) * VIEWBOX];
}
