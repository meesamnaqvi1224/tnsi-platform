import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { LegalDocument } from '@/components/utility/legal-document';
import { cookiesContent } from '@/content/legal/cookies';
import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: cookiesContent.title,
  description: cookiesContent.introduction,
  path: '/cookies',
});

export default function CookiesPage() {
  const jsonLd = [
    createWebPageJsonLd({
      title: cookiesContent.title,
      description: cookiesContent.introduction,
      path: '/cookies',
    }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: cookiesContent.title, path: '/cookies' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
        <LegalDocument
          title={cookiesContent.title}
          lastUpdated={cookiesContent.lastUpdated}
          introduction={cookiesContent.introduction}
          sections={cookiesContent.sections}
        />
      </main>
      <SiteFooter />
    </>
  );
}
