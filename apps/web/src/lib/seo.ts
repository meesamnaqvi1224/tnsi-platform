import type { Metadata } from 'next';
import { env } from '@/env';

export const SITE_NAME = 'The Nervous System Institute';

const DEFAULT_DESCRIPTION =
  'Evidence-informed education for ambitious women, leaders and practitioners who want sustainable success without sacrificing their wellbeing.';

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
  imagePath = '/placeholders/discovery-hero.svg',
}: PageMetadataOptions): Metadata {
  const canonical = absoluteUrl(path);
  const image = absoluteUrl(imagePath);
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;

  return {
    title: fullTitle,
    description,
    alternates: { canonical },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type,
      locale: 'en_GB',
      url: canonical,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      images: [{ url: image, alt: SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
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
    sameAs: [],
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
