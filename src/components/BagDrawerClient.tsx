'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { Market } from '@/lib/vendure/channels';

const subscribeToMount = () => () => {};

export type BagDrawerLine = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  options: string;
  quantity: number;
  price: string;
};

export function BagDrawerClient({
  market,
  quantity = 0,
  subtotal = '',
  lines = [],
  unavailable = false,
  loading = false,
}: {
  market: Market;
  quantity?: number;
  subtotal?: string;
  lines?: BagDrawerLine[];
  unavailable?: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);
  const titleId = useId();
  const mounted = useSyncExternalStore(subscribeToMount, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => close.current?.focus());

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !drawer.current) return;
      const focusable = [...drawer.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function dismiss() {
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <>
      <button
        ref={trigger}
        className="header-link bag"
        type="button"
        aria-expanded={open}
        aria-controls="bag-drawer"
        onClick={() => setOpen(true)}
      >
        Bag
        {quantity > 0 ? (
          <span className="bagcount num" aria-label={`${quantity} in your bag`}>{quantity}</span>
        ) : null}
      </button>

      {mounted ? createPortal(<div
        className="bag-drawer-layer"
        data-open={open ? 'true' : 'false'}
        aria-hidden={!open}
        inert={!open}
      >
        <button className="bag-drawer__backdrop" type="button" aria-label="Close bag" onClick={dismiss} />
        <aside
          ref={drawer}
          id="bag-drawer"
          className="bag-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <header className="bag-drawer__header">
            <div>
              <span className="lab">Your selection</span>
              <h2 id={titleId}>Bag{quantity ? ` · ${quantity}` : ''}</h2>
            </div>
            <button ref={close} className="bag-drawer__close" type="button" onClick={dismiss}>
              Close <span aria-hidden="true">×</span>
            </button>
          </header>

          <div className="bag-drawer__body">
            {loading ? (
              <div className="bag-drawer__empty" aria-live="polite">
                <span className="bag-drawer__pulse" aria-hidden="true" />
                <h3>Preparing your bag</h3>
              </div>
            ) : unavailable ? (
              <div className="bag-drawer__empty bag-drawer__empty--unavailable" aria-live="polite">
                <span className="lab">Temporarily unavailable</span>
                <h3>We couldn&rsquo;t refresh your bag.</h3>
                <p>Open the full bag to reconnect and see your latest selection.</p>
              </div>
            ) : lines.length ? (
              <ul className="bag-drawer__lines">
                {lines.slice(0, 3).map((line, index) => (
                  <li key={line.id} style={{ '--drawer-index': index } as React.CSSProperties}>
                    <Link className="bag-drawer__image" href={`/${market}/products/${line.slug}`} onClick={() => setOpen(false)}>
                      {line.image ? (
                        <Image src={line.image} alt="" width={180} height={240} sizes="96px" />
                      ) : null}
                    </Link>
                    <div className="bag-drawer__line-copy">
                      <Link href={`/${market}/products/${line.slug}`} onClick={() => setOpen(false)}>{line.name}</Link>
                      {line.options ? <small>{line.options}</small> : null}
                      <small>Quantity {line.quantity}</small>
                    </div>
                    <span className="num">{line.price}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="bag-drawer__empty">
                <span className="lab">Nothing here yet</span>
                <h3>Your bag is ready for something new.</h3>
                <p>Explore the house edit and add a piece when it feels right.</p>
                <Link className="btn" href={`/${market}/shop`} onClick={() => setOpen(false)}>Shop the collection</Link>
              </div>
            )}
          </div>

          <footer className="bag-drawer__footer">
            {quantity > 0 ? (
              <div className="bag-drawer__subtotal">
                <span>Subtotal</span>
                <strong className="num">{subtotal}</strong>
              </div>
            ) : null}
            <p>Shipping and delivery are confirmed at checkout.</p>
            <div className="bag-drawer__actions">
              {quantity > 0 ? <Link className="btn" href={`/${market}/checkout`} onClick={() => setOpen(false)}>Checkout</Link> : null}
              <Link className="btn-q" href={`/${market}/cart`} onClick={() => setOpen(false)}>View full bag</Link>
            </div>
          </footer>
        </aside>
      </div>, document.body) : null}
    </>
  );
}
