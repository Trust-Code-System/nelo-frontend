'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * The storefront's single motion island at the root.
 *
 * Owns the ONLY Lenis instance (fine pointers, full motion preference only) and keeps
 * ScrollTrigger in sync with it, so every page scrolls like the home page. Page-level
 * islands (HomeExperience and friends) choreograph their own sequences on top; they never
 * start a second smooth-scroll engine.
 *
 * The reveal grammar is declarative and server-friendly:
 *   [data-motion-reveal]  - rise + fade when the element enters
 *   [data-motion-words]   - heading splits into masked words that rise in sequence
 *   [data-motion-clip]    - frame wipes upward while the image inside settles from 1.08
 * plus a few auto-targeted house patterns (product grids, footer columns). Everything is
 * authored with gsap.from/-fromTo, so with JavaScript or full motion unavailable the
 * content simply renders in its final state.
 *
 * App Router keeps this provider mounted across navigations, so the reveal setup re-runs
 * per pathname; Lenis itself is created once and left alone.
 */

/** Split an element's text into masked word spans, preserving inline markup. */
function splitWords(root: HTMLElement): HTMLElement[] {
  const accessible = root.textContent ?? '';
  const inners: HTMLElement[] = [];

  const splitNode = (node: Node, insideLink: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      const fragment = document.createDocumentFragment();
      for (const part of text.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          fragment.appendChild(document.createTextNode(' '));
          continue;
        }
        const mask = document.createElement('span');
        mask.className = 'mw';
        mask.setAttribute('aria-hidden', 'true');
        const inner = document.createElement('span');
        inner.className = 'mw-i';
        inner.textContent = part;
        mask.appendChild(inner);
        fragment.appendChild(mask);
        inners.push(inner);
      }
      node.parentNode?.replaceChild(fragment, node);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    // Never split inside a link or control: the accessible name and the hit area
    // must survive intact. BR and friends carry no text and are left alone.
    if (element.closest('a, button, [role="link"]') || insideLink) return;
    Array.from(element.childNodes).forEach((child) => splitNode(child, insideLink));
  };

  Array.from(root.childNodes).forEach((child) => splitNode(child, false));
  if (inners.length > 0 && !root.hasAttribute('aria-label')) {
    root.setAttribute('aria-label', accessible.replace(/\s+/g, ' ').trim());
  }
  return inners;
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);
  const popped = useRef(false);

  /* Smooth scroll, created once. Lenis is deliberately desktop-only: native touch
     scrolling is the more reliable choice for the storefront's mobile audience. */
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (reducedMotion || !finePointer) return;

    const lenis = new Lenis({
      duration: 1.08,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.86,
      prevent: (node) =>
        Boolean(node.closest?.('select, [data-lenis-prevent]')) ||
        Boolean(document.querySelector('select:open')),
      virtualScroll: () => !document.querySelector('select:open'),
    });
    lenisRef.current = lenis;
    const updateScrollTrigger = () => ScrollTrigger.update();
    const tickLenis = (time: number) => lenis.raf(time * 1000);

    lenis.on('scroll', updateScrollTrigger);
    gsap.ticker.add(tickLenis);
    gsap.ticker.lagSmoothing(0);
    document.documentElement.classList.add('motion-ready');

    const onSelectToggle = (event: Event) => {
      if (!(event.target instanceof HTMLSelectElement)) return;
      const state = 'newState' in event ? String((event as ToggleEvent).newState) : '';
      if (state === 'open') lenis.stop();
      else if (state === 'closed') lenis.start();
    };
    document.addEventListener('toggle', onSelectToggle, true);

    const onPop = () => {
      popped.current = true;
    };
    window.addEventListener('popstate', onPop);

    return () => {
      lenis.off('scroll', updateScrollTrigger);
      gsap.ticker.remove(tickLenis);
      document.removeEventListener('toggle', onSelectToggle, true);
      lenis.destroy();
      lenisRef.current = null;
      window.removeEventListener('popstate', onPop);
      document.documentElement.classList.remove('motion-ready');
    };
  }, []);

  /* Route changes reset the scroll. Next.js scrolls to top on its own, but if the
     visitor was mid-glide when the new page committed, Lenis would otherwise keep
     animating toward the OLD page's scroll depth - landing on an unscrolled void
     where no reveal has ever fired. force:true ends any in-flight animation and
     syncs Lenis's model to the top of the new page. Back/forward (popstate) is
     left to the browser's own scroll restoration. */
  useEffect(() => {
    if (popped.current) {
      popped.current = false;
      return;
    }
    const lenis = lenisRef.current;
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  }, [pathname]);

  /* Reveal systems. Re-run per navigation: App Router swaps the content under us. */
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      /* Rise + fade, the house default. */
      gsap.utils.toArray<HTMLElement>('[data-motion-reveal]').forEach((element) => {
        gsap.from(element, {
          autoAlpha: 0,
          y: 42,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 84%', once: true },
        });
      });

      /* Masked word reveals for the big statements. Splitting mutates the DOM,
         which GSAP's context revert does not undo - so split once, and reuse the
         existing masks when the effect re-runs (StrictMode, HMR). */
      gsap.utils.toArray<HTMLElement>('[data-motion-words]').forEach((element) => {
        const words = element.dataset.motionSplit
          ? Array.from(element.querySelectorAll<HTMLElement>('.mw-i'))
          : splitWords(element);
        element.dataset.motionSplit = 'true';
        if (words.length === 0) return;
        gsap.fromTo(
          words,
          { yPercent: 112 },
          {
            yPercent: 0,
            duration: 0.85,
            ease: 'power4.out',
            stagger: 0.035,
            scrollTrigger: { trigger: element, start: 'top 86%', once: true },
          },
        );
      });

      /* Frame wipes: the clip rises, the photographs settle out of a slight zoom. */
      gsap.utils.toArray<HTMLElement>('[data-motion-clip]').forEach((element) => {
        const images = element.querySelectorAll('img');
        const timeline = gsap.timeline({
          scrollTrigger: { trigger: element, start: 'top 82%', once: true },
        });
        timeline.fromTo(
          element,
          { clipPath: 'inset(0 0 100% 0)' },
          { clipPath: 'inset(0 0 0% 0)', duration: 1.05, ease: 'power4.inOut' },
        );
        if (images.length > 0) {
          timeline.fromTo(
            images,
            { scale: 1.12 },
            { scale: 1, duration: 1.35, ease: 'power3.out', stagger: 0.06 },
            0,
          );
        }
      });

      /* Slow parallax drift for editorial imagery: [data-motion-parallax] moves
         the element (or its first image) against the scroll by the given
         percentage, e.g. data-motion-parallax="8" drifts ±8%. */
      gsap.utils.toArray<HTMLElement>('[data-motion-parallax]').forEach((element) => {
        const amount = Number(element.dataset.motionParallax) || 8;
        const target = element.querySelector('img') ?? element;
        gsap.fromTo(
          target,
          { yPercent: -amount },
          {
            yPercent: amount,
            ease: 'none',
            scrollTrigger: {
              trigger: element,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.7,
              invalidateOnRefresh: true,
            },
          },
        );
      });

      /* Opt-in child stagger: [data-motion-stagger] rises its direct children in
         sequence - product info panels, expression lists, spec groups. */
      gsap.utils.toArray<HTMLElement>('[data-motion-stagger]').forEach((group) => {
        const items = Array.from(group.children);
        if (items.length === 0) return;
        gsap.from(items, {
          autoAlpha: 0,
          y: 26,
          duration: 0.68,
          ease: 'power3.out',
          stagger: 0.06,
          scrollTrigger: { trigger: group, start: 'top 82%', once: true },
        });
      });

      /* Product grids arrive as a cast, not a crowd: one trigger per grid, a short
         stagger across the cards currently entering. */
      gsap.utils.toArray<HTMLElement>('.nelo-product-grid').forEach((grid) => {
        const cards = Array.from(grid.children);
        if (cards.length === 0) return;
        gsap.from(cards, {
          autoAlpha: 0,
          y: 34,
          duration: 0.72,
          ease: 'power3.out',
          stagger: 0.05,
          scrollTrigger: { trigger: grid, start: 'top 82%', once: true },
        });
      });

      /* Footer columns and the mark rise quietly as the house card enters. */
      gsap.utils.toArray<HTMLElement>('.sitefoot').forEach((footer) => {
        const lead = footer.querySelectorAll('.footer-lead > *');
        if (lead.length > 0) {
          gsap.from(lead, {
            autoAlpha: 0,
            y: 30,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.08,
            scrollTrigger: { trigger: footer, start: 'top 78%', once: true },
          });
        }
      });

      /* A trigger measured against a half-laid-out page fires late - and a late
         trigger is a blank section to the visitor. Measurements shift as fonts
         load, images arrive and the navigation settles, so re-measure at every
         one of those moments... */
      const refresh = () => ScrollTrigger.refresh();
      const raf = requestAnimationFrame(refresh);
      const early = window.setTimeout(refresh, 240);
      const late = window.setTimeout(refresh, 900);
      document.fonts.ready.then(refresh);
      window.addEventListener('load', refresh);
      root.querySelectorAll('img').forEach((image) => {
        if (!image.complete) image.addEventListener('load', refresh, { once: true });
      });

      /* ...and if a once-trigger still has not fired even though its start is
         behind us, play it outright. Content must never wait on a measurement. */
      const failsafe = window.setTimeout(() => {
        ScrollTrigger.getAll().forEach((st) => {
          const tween = st.animation;
          if (!tween || st.vars.once !== true) return;
          if (tween.progress() === 0 && st.start <= window.scrollY + window.innerHeight) {
            tween.play();
          }
        });
      }, 1600);

      return () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(early);
        window.clearTimeout(late);
        window.clearTimeout(failsafe);
        window.removeEventListener('load', refresh);
      };
    },
    { scope, dependencies: [pathname] },
  );

  return (
    <div ref={scope} className="motion-root">
      {children}
    </div>
  );
}
