/**
 * Server-side mapping from raw Sanity `powerDrop` query results
 * (`POWER_DROPS_LIST_API_QUERY` / `POWER_DROP_API_BY_SLUG_QUERY`) to the
 * stable JSON contract `/api/v1/powerdrops*` returns. A separate,
 * self-contained mapping file per content type — same pattern as
 * `article-api.ts` — so this API contract can't shift just because an
 * unrelated content type's shape changes.
 */

export interface ApiPowerDropImage {
  url: string;
  alt: string;
}

export interface ApiPowerDropListItem {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  description: string;
  /** `null` for a locked PowerDrop: the card artwork IS the content (see the Sanity schema), so the server withholds it. */
  cardImage: ApiPowerDropImage | null;
  focus: string;
  featured: boolean;
  /** Part of the free introductory selection (editorial `freeAccess`). */
  isFree: boolean;
  /** True when the member cannot open this PowerDrop (paid library, no paid access, membership open). */
  locked: boolean;
}

export interface ApiPowerDropDetail extends ApiPowerDropListItem {
  duration: string | null;
  instructions: string[];
  anchorStatement: string;
}

// --- Raw shapes returned by the GROQ projections ---

interface RawImage {
  url?: string | null;
  alt?: string | null;
}

export interface RawPowerDropListItem {
  id: string;
  title: string;
  slug: string;
  category?: string | null;
  description: string;
  cardImage?: RawImage | null;
  focus: string;
  featured?: boolean | null;
  isFree?: boolean | null;
}

export interface RawPowerDropDetail extends RawPowerDropListItem {
  duration?: string | null;
  instructions?: string[] | null;
  anchorStatement: string;
}

function mapImage(image: RawImage | null | undefined): ApiPowerDropImage | null {
  if (!image?.url) return null;
  return { url: image.url, alt: image.alt ?? '' };
}

/**
 * `locked` comes from the caller's server-side access decision
 * (`contentAccessFor(...).canOpen`), never from anything the client sent.
 * A locked item keeps title/category/focus/description so the library can
 * show what membership includes; the card artwork is withheld.
 */
export function mapPowerDropListItem(
  doc: RawPowerDropListItem,
  locked = false,
): ApiPowerDropListItem {
  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    category: doc.category ?? null,
    description: doc.description,
    cardImage: locked ? null : mapImage(doc.cardImage),
    focus: doc.focus,
    featured: doc.featured ?? false,
    isFree: doc.isFree ?? false,
    locked,
  };
}

/** Only ever called for a PowerDrop the member is allowed to open (the route 403s first), so it is never `locked`. */
export function mapPowerDropDetail(doc: RawPowerDropDetail): ApiPowerDropDetail {
  return {
    ...mapPowerDropListItem(doc, false),
    duration: doc.duration ?? null,
    instructions: doc.instructions ?? [],
    anchorStatement: doc.anchorStatement,
  };
}
