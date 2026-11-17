import { describe, expect, it } from 'vitest';
import { artworkAspectRatio, artworkMaxHeight, fitArtwork } from './artwork-fit';

describe('artworkAspectRatio', () => {
  it('is the real width ÷ height', () => {
    expect(artworkAspectRatio(1000, 1500)).toBeCloseTo(2 / 3);
    expect(artworkAspectRatio(1600, 900)).toBeCloseTo(16 / 9);
    expect(artworkAspectRatio(800, 800)).toBe(1);
  });

  it('is null for a size that cannot be real, so the caller never stretches to a guess', () => {
    for (const [w, h] of [
      [0, 100],
      [100, 0],
      [-5, 10],
      [Number.NaN, 10],
      [100, Number.POSITIVE_INFINITY],
      [10, 1000], // 0.01
      [1000, 10], // 100
    ] as const) {
      expect(artworkAspectRatio(w, h)).toBeNull();
    }
  });
});

describe('artworkMaxHeight', () => {
  it('is about 72% of the window', () => {
    expect(artworkMaxHeight(844)).toBe(608);
    expect(artworkMaxHeight(900)).toBe(648);
  });

  it('never drops below a usable minimum, and survives a bad window height', () => {
    expect(artworkMaxHeight(300)).toBe(360);
    expect(artworkMaxHeight(0)).toBe(360);
    expect(artworkMaxHeight(Number.NaN)).toBe(360);
  });
});

describe('fitArtwork — complete, undistorted, within bounds', () => {
  const near = (v: number, expected: number) => expect(v).toBeCloseTo(expected, 5);

  it('a portrait visual on a 390×844 phone fills the column when it fits', () => {
    // 342 wide column, 2:3 → 513 tall, under the 608 cap
    const { width, height } = fitArtwork(2 / 3, 342, 520, artworkMaxHeight(844));
    near(width, 342);
    near(height, 513);
  });

  it('a very tall visual is narrowed (not cropped) so its whole height fits the cap', () => {
    // 9:16 at 342 wide would be 608 tall; with a 500 cap the box narrows
    const { width, height } = fitArtwork(9 / 16, 342, 520, 500);
    near(height, 500);
    near(width, 281.25);
    near(width / height, 9 / 16);
  });

  it('a wide visual keeps its ratio and is limited by the column', () => {
    const { width, height } = fitArtwork(16 / 9, 342, 520, 608);
    near(width, 342);
    near(height, 192.375);
  });

  it('desktop: artwork gets editorial scale but never grows past its max width', () => {
    const { width, height } = fitArtwork(2 / 3, 1200, 520, artworkMaxHeight(900));
    near(width, 432); // limited by 648 × 2/3, i.e. the height cap
    near(height, 648);
  });

  it('always returns the original ratio', () => {
    for (const ratio of [0.4, 2 / 3, 0.75, 1, 1.5, 16 / 9]) {
      for (const avail of [200, 342, 700]) {
        const { width, height } = fitArtwork(ratio, avail, 520, 600);
        near(width / height, ratio);
        expect(width).toBeLessThanOrEqual(Math.min(avail, 520) + 1e-9);
        expect(height).toBeLessThanOrEqual(600 + 1e-9);
      }
    }
  });
});
