import { describe, expect, it } from 'vitest';
import { buildPreview, JOURNAL_PREVIEW_CHARS } from './journal-preview';

describe('buildPreview', () => {
  it('collapses whitespace and returns short text whole', () => {
    expect(buildPreview('  Hello \n\n  world  ', 18)).toEqual({
      preview: 'Hello world',
      truncated: false,
    });
  });

  it('cuts at 200 characters and reports truncation', () => {
    const { preview, truncated } = buildPreview('a'.repeat(500), 500);
    expect(Array.from(preview)).toHaveLength(JOURNAL_PREVIEW_CHARS);
    expect(truncated).toBe(true);
  });

  it('reports truncation when the entry is longer than the slice that was read', () => {
    // 600 characters were read but the entry has 5,000: the preview is complete for what it saw, yet the entry is longer
    expect(buildPreview('short start', 5_000).truncated).toBe(true);
  });

  it('never splits an emoji', () => {
    const text = '😀'.repeat(250);
    const { preview } = buildPreview(text, 250);
    expect(Array.from(preview)).toHaveLength(200);
    expect(preview).not.toMatch(/[\uD800-\uDBFF]$/); // no dangling high surrogate
  });

  it('handles an empty draft', () => {
    expect(buildPreview('', 0)).toEqual({ preview: '', truncated: false });
  });
});
