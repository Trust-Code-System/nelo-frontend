'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import type { Market } from '@/lib/vendure/channels';

const MARKET_OPTIONS = [
  { market: 'ng' as const, label: 'Nigeria', detail: 'Naira · ₦' },
  { market: 'international' as const, label: 'Worldwide', detail: 'US dollar · $' },
];

export function MarketSelector({ market }: { market: Market }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const current = market === 'ng' ? MARKET_OPTIONS[0]! : MARKET_OPTIONS[1]!;

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || !open) return;
      setOpen(false);
      trigger.current?.focus();
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="market-switcher u-hide" data-open={open ? 'true' : 'false'}>
      <button
        ref={trigger}
        className="market-switcher__trigger"
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{current.label}</span>
        <span className="market-switcher__mark" aria-hidden="true">⌄</span>
      </button>
      <div
        id={panelId}
        className="market-switcher__panel"
        data-open={open ? 'true' : 'false'}
        aria-hidden={!open}
        inert={!open}
      >
        <span className="lab">Shopping region</span>
        {MARKET_OPTIONS.map((option) => (
          <Link
            key={option.market}
            href={`/${option.market}`}
            aria-current={option.market === market ? 'true' : undefined}
            onClick={() => setOpen(false)}
          >
            <span>{option.label}</span>
            <small>{option.detail}</small>
          </Link>
        ))}
      </div>
    </div>
  );
}
