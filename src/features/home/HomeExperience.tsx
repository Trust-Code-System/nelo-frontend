'use client';

import type { ReactNode } from 'react';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * The home page's choreography island.
 *
 * Server-rendered content is passed through as children, so the entire page remains useful
 * before hydration. GSAP owns authored sequences and the pinned runway; CSS still owns
 * small hover/focus feedback. Smooth scrolling and the generic reveal grammar live in the
 * root MotionProvider - there is exactly one Lenis instance on the site, and this is not
 * it.
 */
export function HomeExperience({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    (context, contextSafe) => {
      const root = scope.current;
      if (!root) return;

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) return;

      root.classList.add('motion-enhanced');
      let mounted = true;

      const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro
        .from('.hero-media', { clipPath: 'inset(0 0 100% 0)', duration: 1.25 })
        .from('.hero-media img', { scale: 1.08, duration: 1.7, ease: 'power2.out' }, '<')
        .from('.hero .lab', { autoAlpha: 0, letterSpacing: '0.34em', duration: 0.7 }, 0.18)
        .from(
          '.hero h1 .unmask',
          { yPercent: 112, rotate: 2.5, transformOrigin: 'left bottom', duration: 0.92, stagger: 0.08 },
          0.22,
        )
        .from('.hero .blurb', { autoAlpha: 0, y: 20, duration: 0.72 }, 0.48)
        .from('.hero-foot > *', { autoAlpha: 0, y: 16, duration: 0.58, stagger: 0.08 }, 0.72)
        .from('.hero-scan__meta', { autoAlpha: 0, duration: 0.5 }, 0.78);

      const indexedLooks = root.querySelectorAll('.hero .index li');
      if (indexedLooks.length > 0) {
        intro.from(indexedLooks, { autoAlpha: 0, x: 20, duration: 0.58, stagger: 0.045 }, 0.52);
      }

      const heroMedia = root.querySelector<HTMLElement>('.hero-media');
      const heroImages = heroMedia?.querySelectorAll<HTMLImageElement>('img');
      if (finePointer && heroMedia && heroImages?.length) {
        const imageX = Array.from(heroImages).map((image) =>
          gsap.quickTo(image, 'xPercent', { duration: 0.8, ease: 'power3.out' }),
        );
        const imageY = Array.from(heroImages).map((image) =>
          gsap.quickTo(image, 'yPercent', { duration: 0.8, ease: 'power3.out' }),
        );

        const handlePointerMove = (event: PointerEvent) => {
          const bounds = heroMedia.getBoundingClientRect();
          const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
          const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
          heroMedia.style.setProperty('--scan-x', `${(x * 100).toFixed(2)}%`);
          heroMedia.style.setProperty('--scan-y', `${(y * 100).toFixed(2)}%`);
          imageX.forEach((move, index) => move((x - 0.5) * (index === 0 ? 1.2 : -1.2)));
          imageY.forEach((move) => move((y - 0.5) * 1.2));
        };
        const handlePointerLeave = () => {
          heroMedia.style.setProperty('--scan-x', '50%');
          heroMedia.style.setProperty('--scan-y', '50%');
          imageX.forEach((move) => move(0));
          imageY.forEach((move) => move(0));
        };
        const onPointerMove = contextSafe
          ? contextSafe(handlePointerMove)
          : handlePointerMove;
        const onPointerLeave = contextSafe
          ? contextSafe(handlePointerLeave)
          : handlePointerLeave;

        heroMedia.addEventListener('pointermove', onPointerMove);
        heroMedia.addEventListener('pointerleave', onPointerLeave);
        context.add(() => {
          heroMedia.removeEventListener('pointermove', onPointerMove);
          heroMedia.removeEventListener('pointerleave', onPointerLeave);
        });
      }

      const media = gsap.matchMedia();
      media.add('(min-width: 981px)', () => {
        const film = root.querySelector<HTMLElement>('.film');
        const sticky = film?.querySelector<HTMLElement>('.film-sticky');
        const track = film?.querySelector<HTMLElement>('.film-track');
        if (!film || !sticky || !track) return;

        // Move through exactly the track's horizontal overflow. Overshooting by
        // the track's 12vw of inline padding leaves an empty ink-only frame at
        // the end of the pin.
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
        gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: film,
            start: 'top top',
            end: () => `+=${distance()}`,
            scrub: 0.75,
            pin: sticky,
            // MotionProvider leaves a transformed ancestor in the page. A
            // fixed-position pin is then positioned against that ancestor
            // instead of the viewport and the visible pin becomes all black.
            pinType: 'transform',
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
      });

      /* Exit depth: as the banner scrolls away the procession keeps rising a
         beat longer, so the stage reads as a space with depth, not a card. The
         panel keeps its CSS centering and is deliberately not touched. */
      const procession = root.querySelector<HTMLElement>('.campaign-procession');
      if (heroMedia && procession) {
        gsap.to(procession, {
          yPercent: -4,
          ease: 'none',
          scrollTrigger: {
            trigger: heroMedia,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.6,
          },
        });
      }

      const refresh = () => {
        if (mounted) ScrollTrigger.refresh();
      };
      document.fonts.ready.then(refresh);
      root.querySelectorAll('img').forEach((image) => {
        if (!image.complete) image.addEventListener('load', refresh, { once: true });
      });

      return () => {
        mounted = false;
        media.revert();
        root.classList.remove('motion-enhanced');
      };
    },
    { scope },
  );

  return (
    <div ref={scope} className="home-experience">
      {children}
    </div>
  );
}
