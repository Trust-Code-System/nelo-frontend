import Link from 'next/link';
import { Suspense } from 'react';
import { CartCount } from './CartCount';
import { MobileMenu } from './MobileMenu';
import { MARKETS, type Market } from '@/lib/vendure/channels';

/** Server component. The market switcher is a set of links, not client state — changing
 *  market is a navigation, and it must never silently alter a checkout in flight. */
export function SiteHeader({ market, announcement }: { market: Market; announcement: string }) {
  return (
    <>
      {/* A labelled landmark rather than a bare div: it sits above the <header>, so without
          a role of its own it is page content outside every landmark, and a screen-reader
          user skipping by landmark never reaches it. */}
      <aside className="ann" aria-label="Store announcement">
        <span className="lab">{announcement}</span>
      </aside>
      <header className="hdr">
        <div className="hdr-in">
          <MobileMenu market={market} />
          <nav className="lab nav-links" aria-label="Primary">
            <Link href={`/${market}`}>Shop</Link>
            <Link href={`/${market}/collections`}>Collections</Link>
            <Link href={`/${market}/atelier`}>Atelier</Link>
          </nav>
          <Link className="wordmark" href={`/${market}`}>
            NELO<small>Woman</small>
          </Link>
          <div className="hdr-r">
            <div className="mkt u-hide" role="group" aria-label="Market">
              {MARKETS.map((m) => (
                <Link
                  key={m}
                  href={`/${m}`}
                  aria-current={m === market ? 'true' : undefined}
                  style={
                    m === market
                      ? { background: 'var(--ink)', color: 'var(--paper)', padding: '5px 9px' }
                      : { padding: '5px 9px' }
                  }
                >
                  {m === 'ng' ? 'NG ₦' : 'INT $'}
                </Link>
              ))}
            </div>
            <Link className="lab u-hide" href={`/${market}/search`}>
              Search
            </Link>
            <Link className="lab u-hide" href={`/${market}/account`}>
              Account
            </Link>
            <Link className="lab bag" href={`/${market}/cart`}>
              Bag
              {/* Suspended so the header does not block on a session-bearing read. The
                  fallback is the absence of a number, which is also the empty-bag state —
                  so nothing flashes a wrong count on its way to the right one. */}
              <Suspense fallback={null}>
                <CartCount market={market} />
              </Suspense>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
