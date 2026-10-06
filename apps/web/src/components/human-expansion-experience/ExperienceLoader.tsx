'use client';

import dynamic from 'next/dynamic';

/**
 * Loads the enhancement only in the browser: it renders nothing itself (the
 * content is already in the server-rendered `HumanExpansionTheory`), and
 * Three.js is fetched by the enhancer only if the scene is going to run, so it
 * never lands in any other page's bundle.
 */
const ExperienceEnhancer = dynamic(() => import('./ExperienceEnhancer'), { ssr: false });

export function ExperienceLoader({ debug = false }: { debug?: boolean }) {
  return <ExperienceEnhancer debug={debug} />;
}
