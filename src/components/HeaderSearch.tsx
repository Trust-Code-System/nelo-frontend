'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { DirectLinkMark } from '@/components/DirectLinkMark';
import type { Market } from '@/lib/vendure/channels';

export function HeaderSearch({ market }: { market: Market }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    function onPointerDown(event: PointerEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div className="header-search u-hide" ref={root} data-open={open ? 'true' : 'false'}>
      <button
        className="header-link"
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        Search
      </button>
      <div className="header-search__panel" id={id} aria-hidden={!open}>
        <form action={`/${market}/search`} method="get" role="search">
          <label htmlFor={`${id}-input`}>What are you looking for?</label>
          <div>
            <input
              ref={input}
              id={`${id}-input`}
              type="search"
              name="q"
              placeholder="Dress, set, black, bridal"
              maxLength={100}
              tabIndex={open ? 0 : -1}
            />
            <button type="submit" tabIndex={open ? 0 : -1}>Search</button>
          </div>
        </form>
        <div className="header-search__foot">
          <span>Try Adele, Reign or bridal</span>
          <Link href={`/${market}/search`} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>
            Open full search <DirectLinkMark />
          </Link>
        </div>
      </div>
    </div>
  );
}
