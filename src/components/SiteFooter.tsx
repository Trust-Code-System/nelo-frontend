import Link from 'next/link';
import type { Market } from '@/lib/vendure/channels';

/**
 * The footer column headings are h2, not h4.
 *
 * They were h4 while every page heading around them was h1, which skips two levels and
 * leaves a screen reader's outline with holes in it. These sections are siblings of the
 * page's own content sections, so h2 is what they actually are.
 */
export function SiteFooter({ market }: { market: Market }) {
  return (
    <footer>
      <div className="fgrid">
        <div>
          <span className="wordmark" style={{ textAlign: 'left', display: 'block' }}>
            NELO<small>Woman</small>
          </span>
          <p style={{ color: 'var(--smoke)', fontSize: 'var(--t-sm)', maxWidth: '30ch', marginTop: 'var(--s4)' }}>
            Cut in Lagos. Shipped worldwide. Sizes 6 to 30, always.
          </p>
        </div>
        <div>
          <h2>Atelier</h2>
          <ul>
            <li><Link href={`/${market}/atelier`}>Bespoke</Link></li>
            <li><Link href={`/${market}/atelier`}>Bridal</Link></li>
            <li><Link href={`/${market}/atelier`}>Book a fitting</Link></li>
          </ul>
        </div>
        <div>
          <h2>Care</h2>
          <ul>
            <li><Link href={`/${market}/size-guide`}>Size guide</Link></li>
            <li><Link href={`/${market}/shipping`}>Shipping</Link></li>
            <li><Link href={`/${market}/returns`}>Returns</Link></li>
            <li><Link href={`/${market}/order-tracking`}>Track an order</Link></li>
            <li><Link href={`/${market}/contact`}>Contact</Link></li>
            <li><Link href={`/${market}/about`}>About Nelo</Link></li>
          </ul>
        </div>
        <div>
          <h2>Region</h2>
          <ul>
            <li><Link href="/ng">Nigeria — NGN</Link></li>
            <li><Link href="/international">International — USD</Link></li>
          </ul>
        </div>
      </div>
      <p className="lab" style={{ marginTop: 'var(--s7)' }}>© 2026 Nelo Woman · Lagos</p>
    </footer>
  );
}
