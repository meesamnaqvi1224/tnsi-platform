/**
 * The short preview shown in the journal history list. Pure and free of any database import, so it is
 * trivially testable. The list query reads only the first few hundred characters of each entry's text
 * (see PREVIEW_SOURCE_CHARS in journal.ts) rather than all 20,000, and this turns that slice into the
 * one-line preview.
 */
export const JOURNAL_PREVIEW_CHARS = 200;

/**
 * A single-line preview: whitespace collapsed, cut at 200 characters (counted as characters, never
 * splitting an emoji or other surrogate pair). `fullLength` is the length of the whole text, so a long
 * entry is reported as truncated even when its start is short after collapsing.
 */
export function buildPreview(
  source: string,
  fullLength: number,
): { preview: string; truncated: boolean } {
  const collapsed = Array.from(source.replace(/\s+/g, ' ').trim());
  const preview = collapsed.slice(0, JOURNAL_PREVIEW_CHARS).join('').trimEnd();
  const truncated =
    collapsed.length > JOURNAL_PREVIEW_CHARS || fullLength > Array.from(source).length;
  return { preview, truncated };
}
