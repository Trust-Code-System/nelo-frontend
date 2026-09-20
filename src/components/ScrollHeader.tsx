'use client';

import { useEffect, useRef, useState } from 'react';

export function ScrollHeader({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const stack = useRef<HTMLDivElement>(null);
  const lastY = useRef(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    lastY.current = window.scrollY;

    const onScroll = () => {
      if (frame.current !== null) return;
      frame.current = window.requestAnimationFrame(() => {
        const current = window.scrollY;
        const delta = current - lastY.current;
        const active = document.activeElement;
        const headerHasFocus = active instanceof HTMLElement && Boolean(active.closest('.site-header-stack'));

        if (current < 72 || headerHasFocus) setHidden(false);
        else if (delta > 10 && current > 150) setHidden(true);
        else if (delta < -7) setHidden(false);

        /* The pill breathes: full height at the top of the page, compact once
           the visitor is reading. */
        setScrolled(current > 24);

        lastY.current = current;
        frame.current = null;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    stack.current?.setAttribute('data-ready', 'true');
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <div
      ref={stack}
      className="site-header-stack"
      data-hidden={hidden ? 'true' : 'false'}
      data-scrolled={scrolled ? 'true' : 'false'}
    >
      {children}
    </div>
  );
}
