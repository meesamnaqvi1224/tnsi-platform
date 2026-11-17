import NextLink from 'next/link';
import { buttonVariants, Container, Section } from '@tnsi/ui';
import { JsonLd } from '@/components/seo/json-ld';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { LegalDocument } from '@/components/utility/legal-document';
import { accountDeletionContent } from '@/content/legal/account-deletion';
import { ACCOUNT_PAGE_PATH, signInUrlFor } from '@/lib/auth-redirect';
import { createBreadcrumbJsonLd, createPageMetadata, createWebPageJsonLd } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: accountDeletionContent.title,
  description: accountDeletionContent.introduction,
  path: '/delete-account',
});

/**
 * The public account-deletion page. No sign-in is needed to read it; the actual deletion happens in the
 * app or on the signed-in Account page, both of which act only on the signed-in member.
 */
export default function DeleteAccountPage() {
  const jsonLd = [
    createWebPageJsonLd({
      title: accountDeletionContent.title,
      description: accountDeletionContent.introduction,
      path: '/delete-account',
    }),
    createBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: accountDeletionContent.title, path: '/delete-account' },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="main-content">
        <LegalDocument
          title={accountDeletionContent.title}
          lastUpdated={accountDeletionContent.lastUpdated}
          introduction={accountDeletionContent.introduction}
          sections={accountDeletionContent.sections}
        />
        <Section spacing="lg" aria-label="Delete your account">
          <Container size="xl">
            <div className="mx-auto flex max-w-3xl flex-wrap gap-3">
              <NextLink
                href={signInUrlFor(ACCOUNT_PAGE_PATH)}
                className={buttonVariants({ variant: 'primary', size: 'lg' })}
              >
                Sign in to delete your account
              </NextLink>
              <NextLink
                href="/contact"
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                Contact us
              </NextLink>
            </div>
          </Container>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
