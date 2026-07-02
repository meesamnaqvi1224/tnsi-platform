/**
 * Production photography paths under /public/images.
 * Alt text lives alongside content in page-specific modules.
 */

export const homeImages = {
  heroPortrait: '/images/home/hero-portrait.webp',
  methodPanel: '/images/home/method-panel.webp',
  programLifeBeyondTrauma: '/images/home/program-life-beyond-trauma.webp',
  programPractitioner: '/images/home/program-practitioner.webp',
  programExecutive: '/images/home/program-executive.webp',
} as const;

export const aboutImages = {
  missionEditorial: '/images/about/mission-editorial.webp',
  founderPortrait: '/images/about/founder-portrait.webp',
} as const;

export const methodImages = {
  heroPortrait: '/images/method/hero-portrait.webp',
} as const;

export const articleImages = {
  hero: '/images/articles/post-hero.webp',
  figureInline: '/images/articles/figure-inline.webp',
  figureFull: '/images/articles/figure-full.webp',
  authorPortrait: '/images/articles/author-portrait.webp',
  related: [
    '/images/articles/related-01.webp',
    '/images/articles/related-02.webp',
    '/images/articles/related-03.webp',
  ],
} as const;

export const sharedImages = {
  ogDefault: '/images/shared/og-default.webp',
  carolinePortraitPrimary: '/images/shared/caroline-portrait-primary.webp',
} as const;
