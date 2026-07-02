import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { LegalDocument } from '@/components/utility/legal-document';
import { privacyContent } from '@/content/legal/privacy';
import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: privacyContent.title,
  description: privacyContent.introduction,
  path: '/privacy',
});

export default function PrivacyPage() {
  const jsonLd = [
    createWebPageJsonLd({
      title: privacyContent.title,
      description: privacyContent.introduction,
      path: '/privacy',
    }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: privacyContent.title, path: '/privacy' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
        <LegalDocument
          title={privacyContent.title}
          lastUpdated={privacyContent.lastUpdated}
          introduction={privacyContent.introduction}
          sections={privacyContent.sections}
        />
      </main>
      <SiteFooter />
    </>
  );
}
