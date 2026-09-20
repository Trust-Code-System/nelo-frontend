'use client';

import { useEffect } from 'react';

/**
 * Magnetic pointer response for primary actions.
 *
 * One delegated listener for every `[data-magnetic]` element on the page rather
 * than a wrapper component per button: this stays a single ~1KB island instead
 * of turning each call to action into a client component, which would pull the
 * hero and the commission panels across the server boundary for the sake of a
 * hover effect.
 *
 * It writes `--mx` / `--my` and lets CSS own the transform. Both custom
 * properties default to 0 in globals.css, so with JavaScript unavailable, on a
 * touch device, or under reduced motion, the rule is simply inert.
 */

/** Fraction of the pointer's offset from centre that the element travels. */
const STRENGTH = 0.3;
/** How far outside the element the field reaches, in px. */
const RADIUS = 90;
/** Beyond this the element is released rather than eased back from far away. */
const MAX_TRAVEL = 14;

export function Magnetic() {
  useEffect(() => {
    // A magnet needs hover. On coarse pointers it would only ever fire on tap,
    // which is indistinguishable from the element flinching when pressed.
    const fine = window.matchMedia('(pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || reduced.matches) return;

    let frame = 0;
    let latest: { x: number; y: number } | null = null;

    function release(el: HTMLElement) {
      if (!('tracking' in el.dataset)) return;
      delete el.dataset.tracking;
      el.style.setProperty('--mx', '0');
      el.style.setProperty('--my', '0');
    }

    function apply() {
      frame = 0;
      const point = latest;
      if (!point) return;
      // Measured inside the frame rather than cached: a cached rect goes stale
      // on scroll and resize, and there are only a handful of these elements.
      for (const el of document.querySelectorAll<HTMLElement>('[data-magnetic]')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        const dx = point.x - (r.left + r.width / 2);
        const dy = point.y - (r.top + r.height / 2);
        const near = Math.abs(dx) < r.width / 2 + RADIUS && Math.abs(dy) < r.height / 2 + RADIUS;
        if (!near) {
          release(el);
          continue;
        }
        const clamp = (n: number) => Math.max(-MAX_TRAVEL, Math.min(MAX_TRAVEL, n * STRENGTH));
        el.dataset.tracking = '';
        el.style.setProperty('--mx', clamp(dx).toFixed(2));
        el.style.setProperty('--my', clamp(dy).toFixed(2));
      }
    }

    function onMove(event: PointerEvent) {
      latest = { x: event.clientX, y: event.clientY };
      // One measure-and-write per frame. Reading layout on every pointermove is
      // what makes this pattern stutter.
      if (!frame) frame = requestAnimationFrame(apply);
    }

    // Leaving the window never fires a final pointermove, so the last hovered
    // element would stay displaced until the pointer came back.
    function onLeave() {
      latest = null;
      for (const el of document.querySelectorAll<HTMLElement>('[data-magnetic]')) release(el);
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      if (frame) cancelAnimationFrame(frame);
      onLeave();
    };
  }, []);

  return null;
}
