import type { Metadata } from 'next';
import { Instrument_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

// Two families only, per STYLESEED.md. Inter is banned: the outgoing Shopify site used it
// on 207 of 208 elements, which is why the storefront had no typographic identity.
const sans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-instrument-sans',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'NELO WOMAN', template: '%s — NELO WOMAN' },
  description: 'Statement femininity for the modern woman. Cut in Lagos, sizes 6 to 30.',
};

// No 'use client' here, and none on any layout. Interactivity lives in islands.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
