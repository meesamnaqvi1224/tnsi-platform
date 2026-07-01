import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { LegalDocument } from '@/components/utility/legal-document';
import { termsContent } from '@/content/legal/terms';
import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: termsContent.title,
  description: termsContent.introduction,
  path: '/terms',
});

export default function TermsPage() {
  const jsonLd = [
    createWebPageJsonLd({
      title: termsContent.title,
      description: termsContent.introduction,
      path: '/terms',
    }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: termsContent.title, path: '/terms' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main>
        <LegalDocument
          title={termsContent.title}
          lastUpdated={termsContent.lastUpdated}
          introduction={termsContent.introduction}
          sections={termsContent.sections}
        />
      </main>
      <SiteFooter />
    </>
  );
}
