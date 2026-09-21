'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Text that rolls upward on hover, revealing a second copy underneath - the
 * classic editorial link tick. The whole visible construction is aria-hidden;
 * the parent link or button keeps its own accessible name via aria-label, so
 * the label is announced exactly once and never duplicated by the second copy.
 *
 * Click used to reverse the rail the instant :active ended, so the second
 * copy only travelled halfway. Pointer-down now holds the rolled state for
 * the length of the CSS transition; reduced-motion still never moves the rail.
 */
export function RollText({ text }: { text: string }) {
  const root = useRef<HTMLSpanElement>(null);
  const [rolled, setRolled] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const host = root.current?.parentElement;
    if (!host) return;

    const clearTimer = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };

    const play = () => {
      clearTimer();
      setRolled(true);
    };

    const rest = () => {
      clearTimer();
      timer.current = setTimeout(() => setRolled(false), 400);
    };

    host.addEventListener('pointerenter', play);
    host.addEventListener('pointerdown', play);
    host.addEventListener('focusin', play);
    host.addEventListener('pointerleave', rest);
    host.addEventListener('focusout', rest);

    return () => {
      clearTimer();
      host.removeEventListener('pointerenter', play);
      host.removeEventListener('pointerdown', play);
      host.removeEventListener('focusin', play);
      host.removeEventListener('pointerleave', rest);
      host.removeEventListener('focusout', rest);
    };
  }, []);

  return (
    <span ref={root} className="rolltext" aria-hidden="true" data-rolled={rolled ? 'true' : undefined}>
      <span className="rolltext__rail">
        <span className="rolltext__line">{text}</span>
        <span className="rolltext__line rolltext__line--alt">{text}</span>
      </span>
    </span>
  );
}
