import { Container, Section, Stack, Text } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { LazySearchInterface } from '@/components/utility/lazy-search-interface';
import { searchContent } from '@/content/search';
import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

const { seo, hero } = searchContent;

export const metadata = createPageMetadata({
  title: seo.title,
  description: seo.description,
  path: '/search',
  noIndex: true,
});

export default function SearchPage() {
  const jsonLd = [
    createWebPageJsonLd({
      title: seo.title,
      description: seo.description,
      path: '/search',
    }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: seo.title, path: '/search' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
        <Section spacing="xl" aria-labelledby="search-heading">
          <Container size="xl">
            <Stack gap="3xl">
              <header className="mx-auto max-w-3xl text-center">
                <h1
                  id="search-heading"
                  className="font-heading text-foreground text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl"
                >
                  {hero.heading}
                </h1>
                <Text
                  id="search-instructions"
                  tone="muted"
                  className="mt-(--space-lg) leading-relaxed"
                >
                  {hero.supportingCopy}
                </Text>
              </header>

              <LazySearchInterface />
            </Stack>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
