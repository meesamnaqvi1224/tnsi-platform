import type { Metadata } from 'next';
import NextLink from 'next/link';
import { buttonVariants, Container, Section, Stack, Text } from '@tnsi/ui';
import { EditorialImage } from '@/components/utility/editorial-image';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { JsonLd } from '@/components/seo/json-ld';
import { notFoundContent } from '@/content/not-found';
import { createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

const NOT_FOUND_TITLE = 'Page Not Found';

export const metadata: Metadata = createPageMetadata({
  title: NOT_FOUND_TITLE,
  description: notFoundContent.supportingCopy,
  path: '/404',
  noIndex: true,
});

export default function NotFound() {
  const jsonLd = createWebPageJsonLd({
    title: NOT_FOUND_TITLE,
    description: notFoundContent.supportingCopy,
    path: '/404',
  });
  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
        <Section spacing="xl" aria-labelledby="not-found-heading">
          <Container size="xl">
            <div className="grid grid-cols-1 items-center gap-(--space-3xl) lg:grid-cols-2 lg:gap-(--space-5xl)">
              <EditorialImage
                src={notFoundContent.imageSrc}
                alt={notFoundContent.imageAlt}
                label={notFoundContent.imageLabel}
                aspect="landscape"
                className="rounded-sm"
              />

              <Stack gap="2xl">
                <h1
                  id="not-found-heading"
                  className="font-heading text-foreground text-3xl leading-[1.1] font-semibold tracking-tight sm:text-4xl lg:text-5xl"
                >
                  {notFoundContent.headline}
                </h1>
                <Text tone="muted" className="max-w-prose text-base leading-relaxed">
                  {notFoundContent.supportingCopy}
                </Text>
                <Stack direction="row" gap="sm" wrap="wrap">
                  <NextLink
                    href={notFoundContent.primaryCta.href}
                    className={buttonVariants({ variant: 'primary', size: 'lg' })}
                  >
                    {notFoundContent.primaryCta.label}
                  </NextLink>
                  <NextLink
                    href={notFoundContent.secondaryCta.href}
                    className={buttonVariants({ variant: 'outline', size: 'lg' })}
                  >
                    {notFoundContent.secondaryCta.label}
                  </NextLink>
                  <NextLink
                    href={notFoundContent.tertiaryCta.href}
                    className="interaction-text-link-underline"
                  >
                    {notFoundContent.tertiaryCta.label}
                  </NextLink>
                </Stack>
              </Stack>
            </div>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
