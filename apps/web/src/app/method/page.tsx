import { HumanExpansionPage } from '@/components/human-expansion-experience/HumanExpansionPage';
import { JsonLd } from '@/components/seo/json-ld';
import { humanExpansionTheoryContent } from '@/content/human-expansion-theory';
import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

const { seo } = humanExpansionTheoryContent;
const PAGE_TITLE = 'Human Expansion Theory™';
const PAGE_DESCRIPTION = seo.description;

export const metadata = createPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  path: '/method',
});

export default function MethodPage() {
  const jsonLd = [
    createWebPageJsonLd({ title: PAGE_TITLE, description: PAGE_DESCRIPTION, path: '/method' }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: PAGE_TITLE, path: '/method' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <HumanExpansionPage />
    </>
  );
}
