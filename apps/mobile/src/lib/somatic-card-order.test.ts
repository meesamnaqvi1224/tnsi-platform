import { describe, it, expect } from 'vitest';
import { sortByOrder } from './somatic-card-order';

describe('sortByOrder', () => {
  it('8/10/11/12. sorts by the explicit `order` field, not array position', () => {
    const items = [
      { order: 2, label: 'c' },
      { order: 0, label: 'a' },
      { order: 1, label: 'b' },
    ];
    expect(sortByOrder(items).map((i) => i.label)).toEqual(['a', 'b', 'c']);
  });

  it('9. supports more than 3 items (never assumes a fixed count)', () => {
    const items = Array.from({ length: 7 }, (_, i) => ({ order: 6 - i, label: `item-${i}` }));
    const sorted = sortByOrder(items);
    expect(sorted).toHaveLength(7);
    expect(sorted.map((i) => i.order)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('does not mutate the input array', () => {
    const items = [{ order: 2 }, { order: 0 }, { order: 1 }];
    const original = [...items];
    sortByOrder(items);
    expect(items).toEqual(original);
  });

  it('handles an already-sorted or single-item array without error', () => {
    expect(sortByOrder([{ order: 0 }])).toEqual([{ order: 0 }]);
    expect(sortByOrder([])).toEqual([]);
  });
});
