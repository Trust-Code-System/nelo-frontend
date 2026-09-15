'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { MARKETS, type Market } from '@/lib/vendure/channels';

/**
 * Mobile navigation.
 *
 * Below 860px the inline nav and market switcher are hidden, so without this the storefront
 * has no navigation at all on a phone — which is most of the traffic. The panel is a real
 * disclosure: labelled, keyboard operable, closes on Escape, and returns focus to the button.
 *
 * Market switching stays a set of links here too, so the market is always visible in the
 * address bar rather than held in client state.
 */
export function MobileMenu({ market }: { market: Market }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        className="menu lab"
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Close' : 'Menu'}
      </button>

      <div id={panelId} className="menu-panel" hidden={!open}>
        <nav aria-label="Primary" className="menu-panel-nav">
          <Link href={`/${market}`} onClick={() => setOpen(false)}>
            Shop
          </Link>
          <Link href={`/${market}`} onClick={() => setOpen(false)}>
            Collections
          </Link>
          <Link href={`/${market}/atelier`} onClick={() => setOpen(false)}>
            Atelier
          </Link>
          <Link href={`/${market}/account/measurements`} onClick={() => setOpen(false)}>
            Your measurements
          </Link>
        </nav>

        <div className="menu-panel-markets" role="group" aria-label="Market">
          {MARKETS.map((m) => (
            <Link
              key={m}
              href={`/${m}`}
              aria-current={m === market ? 'true' : undefined}
              onClick={() => setOpen(false)}
            >
              {m === 'ng' ? 'NG ₦' : 'INT $'}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
