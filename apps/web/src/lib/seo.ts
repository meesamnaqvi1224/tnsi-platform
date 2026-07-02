import type { Metadata } from 'next';
import { env } from '@/env';

export const SITE_NAME = 'The Nervous System Institute';

export const DEFAULT_DESCRIPTION =
  'Evidence-informed education for ambitious women, leaders and practitioners who want sustainable success without sacrificing their wellbeing.';

const DEFAULT_OG_IMAGE = '/images/shared/og-default.webp';

export function getSiteUrl(): string {
  return env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
}

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${normalized}`;
}

interface PageMetadataOptions {
  title: string;
  description?: string;
  path: string;
  noIndex?: boolean;
  type?: 'website' | 'article';
  imagePath?: string;
}

export function createPageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  noIndex = false,
  type = 'website',
  imagePath = DEFAULT_OG_IMAGE,
}: PageMetadataOptions): Metadata {
  const canonical = absoluteUrl(path);
  const image = absoluteUrl(imagePath);
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;

  return {
    metadataBase: new URL(getSiteUrl()),
    title: fullTitle,
    description,
    applicationName: SITE_NAME,
    alternates: { canonical },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    icons: {
      icon: [{ url: '/favicon.ico' }],
    },
    openGraph: {
      type,
      locale: 'en_GB',
      url: canonical,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [{ url: image, alt: SITE_NAME }],
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function createBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function createOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: SITE_NAME,
    url: getSiteUrl(),
    description: DEFAULT_DESCRIPTION,
    logo: absoluteUrl('/favicon.ico'),
    sameAs: [],
  };
}

export function createWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: getSiteUrl(),
    description: DEFAULT_DESCRIPTION,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: getSiteUrl(),
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl('/search')}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface ArticleJsonLdInput {
  headline: string;
  description: string;
  path: string;
  authorName: string;
  datePublished: string;
  imagePath?: string;
}

export function createArticleJsonLd({
  headline,
  description,
  path,
  authorName,
  datePublished,
  imagePath = DEFAULT_OG_IMAGE,
}: ArticleJsonLdInput) {
  const url = absoluteUrl(path);

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    url,
    mainEntityOfPage: url,
    datePublished,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: getSiteUrl(),
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/favicon.ico'),
      },
    },
    image: absoluteUrl(imagePath),
  };
}

export function createWebPageJsonLd({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: absoluteUrl(path),
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: getSiteUrl(),
    },
  };
}
