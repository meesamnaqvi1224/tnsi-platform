import type { Metadata } from 'next';
import { Cormorant_Garamond, Geist_Mono, Inter } from 'next/font/google';
import './globals.css';

// Body sans — see docs/02-brand-strategy.md's typography spec (Inter/Manrope/Satoshi/General Sans).
const sansBody = Inter({
  variable: '--font-sans-body',
  subsets: ['latin'],
});

// Display serif, used via the `font-heading` utility — see docs/02-brand-strategy.md
// (Canela/Noe Display/Cormorant Garamond/Libre Baskerville). Canela and Noe Display
// are commercial typefaces with no next/font/google entry; Cormorant Garamond is the
// closest available option until a licensed alternative is set up.
const displaySerif = Cormorant_Garamond({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'The Nervous System Institute',
  description:
    'Evidence-informed education for ambitious women, leaders and practitioners who want sustainable success without sacrificing their wellbeing.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${sansBody.variable} ${displaySerif.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
