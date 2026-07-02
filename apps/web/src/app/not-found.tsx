import NextLink from 'next/link';
import { buttonVariants, Container, Section, Stack, Text } from '@tnsi/ui';
import { EditorialPlaceholder } from '@/components/utility/editorial-placeholder';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { notFoundContent } from '@/content/not-found';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main>
        <Section spacing="xl" aria-labelledby="not-found-heading">
          <Container size="xl">
            <div className="grid grid-cols-1 items-center gap-(--space-3xl) lg:grid-cols-2 lg:gap-(--space-5xl)">
              <EditorialPlaceholder
                src={notFoundContent.imageSrc}
                alt={notFoundContent.imageAlt}
                label={notFoundContent.imageLabel}
                aspect="landscape"
                className="rounded-sm"
              />

              <Stack gap="2xl">
                <h1
                  id="not-found-heading"
                  className="font-heading text-foreground text-4xl leading-[1.1] font-semibold tracking-tight lg:text-5xl"
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
                    className="text-muted-foreground hover:text-foreground duration-base text-sm underline-offset-4 transition-colors hover:underline"
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
