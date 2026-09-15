import Link from 'next/link';
import type { Market } from '@/lib/vendure/channels';

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
          <h4>Atelier</h4>
          <ul>
            <li><Link href={`/${market}/atelier`}>Bespoke</Link></li>
            <li><Link href={`/${market}/atelier`}>Bridal</Link></li>
            <li><Link href={`/${market}/atelier`}>Book a fitting</Link></li>
          </ul>
        </div>
        <div>
          <h4>Care</h4>
          <ul>
            <li><Link href={`/${market}`}>Shipping</Link></li>
            <li><Link href={`/${market}`}>Returns</Link></li>
            <li><Link href={`/${market}`}>Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4>Region</h4>
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
