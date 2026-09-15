import Link from 'next/link';
import { MARKETS, type Market } from '@/lib/vendure/channels';

/** Server component. The market switcher is a set of links, not client state — changing
 *  market is a navigation, and it must never silently alter a checkout in flight. */
export function SiteHeader({ market, announcement }: { market: Market; announcement: string }) {
  return (
    <>
      <div className="ann">
        <span className="lab">{announcement}</span>
      </div>
      <header className="hdr">
        <div className="hdr-in">
          <button className="menu lab" aria-label="Open menu" type="button">
            Menu
          </button>
          <nav className="lab nav-links" aria-label="Primary">
            <Link href={`/${market}`}>Shop</Link>
            <Link href={`/${market}`}>Collections</Link>
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
            <span className="lab u-hide">Search</span>
            <span className="lab u-hide">Account</span>
            <span className="lab">Bag (0)</span>
          </div>
        </div>
      </header>
    </>
  );
}
