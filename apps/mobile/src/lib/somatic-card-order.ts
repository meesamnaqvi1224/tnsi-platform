/**
 * The Read API's ordered JSONB arrays (`practiceSteps`, `whatToNotice`,
 * `supportingImages`, `demonstrationSequence`) carry their own explicit
 * `order` field per item precisely because array position is never
 * guaranteed to match it (see docs/TNSI_Somatic_Card_Read_API_v1.md §7 -
 * the API returns these arrays as synced, not re-sorted). Sorting by
 * `order` here, not by array index, is what "preserve the API order"
 * actually means for content stored this way - the same fix the web UI
 * milestone made after its own tests caught this exact bug (see
 * docs/TNSI_Somatic_Card_Web_UI_v1.md §7).
 */
export function sortByOrder<T extends { order: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}
