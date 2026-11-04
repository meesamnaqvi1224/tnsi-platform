/**
 * The official TNSI website pages the app hands off to. Paths only; they are
 * joined to the API base URL (the website's own origin) by `buildTnsiUrl`.
 * Pure on purpose (no env, no React Native) so it is unit-tested.
 */
export const TNSI_PAGES = {
  contact: '/contact',
  privacy: '/privacy',
  terms: '/terms',
  billing: '/dashboard/billing',
} as const;

export type TnsiPage = keyof typeof TNSI_PAGES;

export function buildTnsiUrl(baseUrl: string, page: TnsiPage): string {
  return `${baseUrl.replace(/\/+$/, '')}${TNSI_PAGES[page]}`;
}
