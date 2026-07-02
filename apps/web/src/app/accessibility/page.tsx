import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { LegalDocument } from '@/components/utility/legal-document';
import { accessibilityContent } from '@/content/legal/accessibility';
import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: accessibilityContent.title,
  description: accessibilityContent.introduction,
  path: '/accessibility',
});

export default function AccessibilityPage() {
  const jsonLd = [
    createWebPageJsonLd({
      title: accessibilityContent.title,
      description: accessibilityContent.introduction,
      path: '/accessibility',
    }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: accessibilityContent.title, path: '/accessibility' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
        <LegalDocument
          title={accessibilityContent.title}
          lastUpdated={accessibilityContent.lastUpdated}
          introduction={accessibilityContent.introduction}
          sections={accessibilityContent.sections}
        />
      </main>
      <SiteFooter />
    </>
  );
}
