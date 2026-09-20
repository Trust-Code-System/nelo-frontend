import type { Metadata } from 'next';
import { Instrument_Sans, IBM_Plex_Mono } from 'next/font/google';
import { siteUrl } from '@/lib/seo/site';
import { AdaptiveCursor } from '@/components/AdaptiveCursor';
import { MotionProvider } from '@/components/motion/MotionProvider';
import 'lenis/dist/lenis.css';
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
  // Every relative canonical, alternate and OpenGraph URL below resolves against this. Set
  // NELO_SITE_URL per environment; the fallback is localhost, deliberately, because a
  // canonical pointing at the wrong host is worse than one pointing at an obvious local one.
  metadataBase: new URL(siteUrl()),
  title: { default: 'NELO WOMAN', template: '%s - NELO WOMAN' },
  description: 'Statement femininity for the modern woman. Cut in Lagos, sizes 6 to 30.',
  openGraph: {
    siteName: 'NELO WOMAN',
    type: 'website',
    locale: 'en_NG',
  },
  // No Twitter image is declared here: a site-wide fallback image that is not the product
  // being shared is worse than letting the crawler pick from the page.
  twitter: { card: 'summary_large_image' },
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png' }],
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

// No 'use client' here, and none on any layout. Interactivity lives in islands.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <MotionProvider>{children}</MotionProvider>
        <AdaptiveCursor />
      </body>
    </html>
  );
}
