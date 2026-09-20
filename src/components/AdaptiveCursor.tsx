'use client';

import { useEffect, useRef } from 'react';

const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'summary',
  'label',
  'select',
  '[role="button"]',
].join(',');

/**
 * A crisp arrow with a cool-blue halo, used only for precise mice and
 * trackpads. Touch devices keep the platform cursor. Pointer coordinates are
 * written straight to the element inside one animation frame, avoiding a
 * React render per mouse event.
 */
export function AdaptiveCursor() {
  const cursor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!finePointer.matches || !cursor.current) return;

    const element = cursor.current;
    let x = -96;
    let y = -96;
    let frame: number | null = null;
    let visible = false;

    document.documentElement.classList.add('has-adaptive-cursor');

    const paint = () => {
      element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      frame = null;
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      x = event.clientX;
      y = event.clientY;
      if (!visible) {
        visible = true;
        element.dataset.visible = 'true';
      }
      if (frame === null) frame = window.requestAnimationFrame(paint);

      const target = event.target instanceof Element ? event.target : null;
      const interactive = target?.closest(INTERACTIVE_SELECTOR) ?? null;
      element.dataset.interactive = interactive ? 'true' : 'false';
    };

    const hide = () => {
      visible = false;
      element.dataset.visible = 'false';
    };
    const show = () => {
      visible = true;
      element.dataset.visible = 'true';
    };
    const press = () => {
      element.dataset.pressed = 'true';
    };
    const release = () => {
      element.dataset.pressed = 'false';
    };

    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('mouseleave', hide);
    document.documentElement.addEventListener('mouseenter', show);
    window.addEventListener('pointerdown', press, { passive: true });
    window.addEventListener('pointerup', release, { passive: true });

    return () => {
      document.documentElement.classList.remove('has-adaptive-cursor');
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('mouseleave', hide);
      document.documentElement.removeEventListener('mouseenter', show);
      window.removeEventListener('pointerdown', press);
      window.removeEventListener('pointerup', release);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={cursor}
      className="adaptive-cursor"
      data-visible="false"
      data-interactive="false"
      data-pressed="false"
      aria-hidden="true"
    >
      <svg className="adaptive-cursor__arrow" viewBox="0 0 24 24">
        <path d="M4 4 11.07 21l2.51-7.39L21 11.07 4 4Z" />
      </svg>
    </div>
  );
}
