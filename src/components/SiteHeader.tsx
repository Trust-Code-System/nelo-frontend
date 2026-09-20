import Link from 'next/link';
import { Suspense } from 'react';
import { BagDrawer } from './BagDrawer';
import { BagDrawerClient } from './BagDrawerClient';
import { MobileMenu } from './MobileMenu';
import { BrandMark } from './BrandMark';
import { HeaderSearch } from './HeaderSearch';
import { MarketSelector } from './MarketSelector';
import { ScrollHeader } from './ScrollHeader';
import { RollText } from './motion/RollText';
import type { Market } from '@/lib/vendure/channels';

/** Server component. The market switcher is a set of links, not client state - changing
 *  market is a navigation, and it must never silently alter a checkout in flight. */
export function SiteHeader({ market, announcement }: { market: Market; announcement: string }) {
  return (
    <ScrollHeader>
      {/* A labelled landmark rather than a bare div: it sits above the <header>, so without
          a role of its own it is page content outside every landmark, and a screen-reader
          user skipping by landmark never reaches it. */}
      <aside className="ann" aria-label="Store announcement">
        <span className="lab">{announcement}</span>
      </aside>
      <header className="hdr">
        <div className="hdr-in">
          <MobileMenu market={market} />
          <div className="hdr-identity">
            <BrandMark href={`/${market}`} />
            <span className="hdr-context" aria-hidden="true">
              <span>Lagos</span>
              <span>Linear / 26</span>
            </span>
          </div>
          <nav className="nav-links" aria-label="Primary">
            <Link href={`/${market}/shop`} aria-label="Shop" data-index="01">
              <RollText text="Shop" />
            </Link>
            <Link href={`/${market}/collections`} aria-label="Collections" data-index="02">
              <RollText text="Collections" />
            </Link>
            <Link href={`/${market}/atelier`} aria-label="Atelier" data-index="03">
              <RollText text="Atelier" />
            </Link>
          </nav>
          <div className="hdr-r">
            <MarketSelector market={market} />
            <HeaderSearch market={market} />
            <Link className="header-link u-hide" href={`/${market}/account`} aria-label="Account">
              <RollText text="Account" />
            </Link>
            <Suspense fallback={<BagDrawerClient market={market} loading />}>
              <BagDrawer market={market} />
            </Suspense>
          </div>
        </div>
      </header>
    </ScrollHeader>
  );
}
