'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { NeloWord } from './NeloWord';

export function BrandMark({ href, footer = false }: { href: string; footer?: boolean }) {
  const [rolling, setRolling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function play() {
    if (timer.current) clearTimeout(timer.current);
    setRolling(false);
    requestAnimationFrame(() => setRolling(true));
    timer.current = setTimeout(() => setRolling(false), 720);
  }

  return (
    <Link
      className={`brand-mark${footer ? ' brand-mark--footer' : ''}`}
      href={href}
      aria-label="NELO Woman home"
      data-rolling={rolling ? 'true' : undefined}
      onPointerEnter={play}
      onPointerDown={play}
      onFocus={play}
    >
      <NeloWord rolling inverse={footer} />
    </Link>
  );
}
