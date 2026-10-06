import type { Metadata } from 'next';
import { HumanExpansionPage } from '@/components/human-expansion-experience/HumanExpansionPage';

/**
 * HIDDEN PROTOTYPE — Human Expansion Theory™ 3D experience, kept temporarily
 * for comparison with `/method` (which renders the same composition when
 * `ENABLE_HUMAN_EXPANSION_3D=true`).
 *
 * Not linked anywhere, not in the sitemap, `noindex`, and protected by the
 * site's auth middleware in production (it is only opened when
 * `ENABLE_LAB_ROUTES=true`, which is set locally, never in production). See
 * docs/human-expansion-3d-asset.md for the content map and the open licence
 * item that must close before this ships.
 */
export const metadata: Metadata = {
  title: 'Human Expansion — 3D prototype',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ debug?: string }>;
}

export default async function HumanExpansionLabPage({ searchParams }: PageProps) {
  const { debug } = await searchParams;
  return <HumanExpansionPage debug={debug === '1'} />;
}
