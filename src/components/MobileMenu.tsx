'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { DirectLinkMark } from '@/components/DirectLinkMark';
import { MARKETS, type Market } from '@/lib/vendure/channels';

const subscribeToMount = () => () => {};

/**
 * Mobile navigation.
 *
 * Below 860px the inline nav and market switcher are hidden, so without this the storefront
 * has no navigation at all on a phone - which is most of the traffic. The panel is a real
 * disclosure: labelled, keyboard operable, closes on Escape, and returns focus to the button.
 *
 * It is portaled to document.body the same way the bag is. The header stack uses a
 * transform, which would otherwise trap position:fixed and collapse the panel behind the
 * bar so a tap appeared to do nothing.
 *
 * Market switching stays a set of links here too, so the market is always visible in the
 * address bar rather than held in client state.
 */
export function MobileMenu({ market }: { market: Market }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const mounted = useSyncExternalStore(subscribeToMount, () => true, () => false);

  const dismiss = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => {
      closeRef.current?.focus({ preventScroll: true });
    });
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') dismiss();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [dismiss, open]);

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
        Menu
      </button>

      {mounted
        ? createPortal(
            <div
              id={panelId}
              className="menu-panel"
              data-open={open ? 'true' : 'false'}
              aria-hidden={!open}
              inert={!open}
            >
              <button
                ref={closeRef}
                className="menu-panel__close"
                type="button"
                aria-label="Close menu"
                onClick={dismiss}
              >
                <span aria-hidden="true">×</span>
              </button>
              <div className="menu-panel__heading">
                <span className="lab">NELO Woman</span>
                <p>Statement silhouettes, measured for the woman wearing them.</p>
              </div>
              <nav aria-label="Primary" className="menu-panel-nav">
                {([
                  ['01', 'Home', `/${market}`],
                  ['02', 'Shop all', `/${market}/shop`],
                  ['03', 'Collections', `/${market}/collections`],
                  ['04', 'Atelier', `/${market}/atelier`],
                  ['05', 'Search', `/${market}/search`],
                  ['06', 'Your account', `/${market}/account`],
                  ['07', 'Size guide', `/${market}/size-guide`],
                ] as const).map(([number, label, href], index) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    style={{ '--i': index } as CSSProperties}
                  >
                    <span>{number}</span>
                    {label}
                  </Link>
                ))}
              </nav>

              <aside className="menu-panel__editorial" aria-label="Current collection">
                <Image
                  src="/editorial/live/reign-02.webp"
                  alt="The Reign look from Linear Summer 26."
                  width={900}
                  height={1125}
                  sizes="(max-width: 860px) 44vw, 1px"
                />
                <div>
                  <span className="lab">Now showing</span>
                  <strong>Linear Summer 26</strong>
                  <Link href={`/${market}/collections`} onClick={() => setOpen(false)}>
                    Enter the collection <DirectLinkMark />
                  </Link>
                </div>
              </aside>

              <div className="menu-panel-markets" role="group" aria-label="Market">
                {MARKETS.map((m) => (
                  <Link
                    key={m}
                    href={`/${m}`}
                    aria-current={m === market ? 'true' : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {m === 'ng' ? 'Nigeria · Naira' : 'Worldwide · US dollar'}
                  </Link>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
