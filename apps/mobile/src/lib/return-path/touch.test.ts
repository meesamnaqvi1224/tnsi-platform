import { describe, expect, it } from 'vitest';
import { touchToViewBox } from './touch';

describe('touchToViewBox', () => {
  it('maps the stage corners and centre onto the 400 x 400 viewBox', () => {
    expect(touchToViewBox(0, 0, 320)).toEqual([0, 0]);
    expect(touchToViewBox(320, 320, 320)).toEqual([400, 400]);
    expect(touchToViewBox(160, 160, 320)).toEqual([200, 200]);
  });

  it('scales with the stage size', () => {
    expect(touchToViewBox(100, 50, 200)).toEqual([200, 100]);
  });

  it('refuses an unmeasured stage rather than dividing by zero', () => {
    expect(touchToViewBox(10, 10, 0)).toBeNull();
    expect(touchToViewBox(10, 10, Number.NaN)).toBeNull();
  });
});
