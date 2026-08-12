import type { Metadata } from 'next';
import { Cormorant_Garamond, Geist_Mono, Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { SkipLink } from '@/components/layout/skip-link';
import { JsonLd } from '@/components/seo/json-ld';
import { createOrganizationJsonLd, createPageMetadata, createWebSiteJsonLd } from '@/lib/seo';
import './globals.css';

const sansBody = Inter({
  variable: '--font-sans-body',
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
});

const displaySerif = Cormorant_Garamond({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
  preload: false,
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  adjustFontFallback: true,
});

export const metadata: Metadata = createPageMetadata({
  title: 'The Nervous System Institute',
  description:
    'Evidence-informed education for ambitious women, leaders and practitioners who want sustainable success without sacrificing their wellbeing.',
  path: '/',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en-GB">
        <body
          className={`${sansBody.variable} ${displaySerif.variable} ${geistMono.variable} antialiased`}
        >
          <SkipLink />
          <JsonLd data={[createOrganizationJsonLd(), createWebSiteJsonLd()]} />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
