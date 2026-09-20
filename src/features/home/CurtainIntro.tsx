'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { NeloWord } from '@/components/NeloWord';

const INTRO_KEY = 'nelo-couture-intro-v1';

export function CurtainIntro() {
  // Closed by default so a failed or disabled script can never cover the store.
  // useLayoutEffect opens it before the first client paint for eligible visitors.
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const skipButton = useRef<HTMLButtonElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const forced = useRef(false);

  const finish = useCallback(() => {
    document.body.classList.remove('intro-locked');
    try {
      if (!forced.current) sessionStorage.setItem(INTRO_KEY, 'seen');
    } catch {
      // Storage can be unavailable in locked-down browser contexts. The intro
      // still completes normally; it may simply replay on a later visit.
    }
    setVisible(false);
  }, []);

  const skip = useCallback(() => {
    const element = root.current;
    timeline.current?.kill();
    if (!element) {
      finish();
      return;
    }
    gsap.to(element, { autoAlpha: 0, duration: 0.18, onComplete: finish });
  }, [finish]);

  useLayoutEffect(() => {
    forced.current = new URLSearchParams(window.location.search).has('intro');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      try {
        sessionStorage.setItem(INTRO_KEY, 'seen');
      } catch {
        // See the storage note in finish().
      }
      return;
    }

    let seen = false;
    try {
      seen = sessionStorage.getItem(INTRO_KEY) === 'seen';
    } catch {
      // Treat unavailable session storage as a first visit.
    }
    if (forced.current || !seen) setVisible(true);
  }, []);

  useLayoutEffect(() => {
    if (!visible) return;

    const element = root.current;
    if (!element) return;
    document.body.classList.add('intro-locked');
    const background = document.querySelectorAll<HTMLElement>(
      '.home-experience > :not(.curtain-intro)',
    );
    background.forEach((item) => { item.inert = true; });
    skipButton.current?.focus({ preventScroll: true });

    const context = gsap.context(() => {
      timeline.current = gsap
        .timeline({ defaults: { ease: 'power3.out' }, onComplete: finish })
        .set('.curtain-intro__mark .nelo-word', { perspective: 700 })
        .from('.curtain-intro__mark .nelo-word__single', {
          yPercent: 125,
          rotateX: -72,
          opacity: 0,
          transformOrigin: '50% 100%',
          duration: 0.62,
        })
        .from('.curtain-intro__rule', { scaleX: 0, duration: 0.46 }, 0.24)
        .from('.curtain-intro__copy', { y: 10, autoAlpha: 0, duration: 0.4 }, 0.44)
        .to('.curtain-intro__panel--left', {
          xPercent: -102,
          borderBottomRightRadius: '48vh',
          duration: 0.72,
          ease: 'power4.inOut',
        }, 0.94)
        .to('.curtain-intro__panel--right', {
          xPercent: 102,
          borderBottomLeftRadius: '48vh',
          duration: 0.72,
          ease: 'power4.inOut',
        }, 0.94)
        .to('.curtain-intro__content', {
          scale: 0.94,
          autoAlpha: 0,
          duration: 0.34,
          ease: 'power2.in',
        }, 1.18)
        .to('.curtain-intro__skip', { autoAlpha: 0, duration: 0.16, ease: 'power1.out' }, 1.5)
        .to(element, { autoAlpha: 0, duration: 0.16 }, 1.62);
    }, element);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') skip();
      if (event.key === 'Tab') {
        event.preventDefault();
        skipButton.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      context.revert();
      background.forEach((item) => { item.inert = false; });
      document.body.classList.remove('intro-locked');
    };
  }, [finish, skip, visible]);

  if (!visible) return null;

  return (
    <div
      ref={root}
      className="curtain-intro"
      role="dialog"
      aria-modal="true"
      aria-label="NELO Woman introduction"
    >
      <div className="curtain-intro__panel curtain-intro__panel--left" aria-hidden="true" />
      <div className="curtain-intro__panel curtain-intro__panel--right" aria-hidden="true" />
      <div className="curtain-intro__content">
        <div className="curtain-intro__mark">
          <NeloWord inverse />
        </div>
        <span className="curtain-intro__rule" aria-hidden="true" />
        <p className="curtain-intro__copy">Statement femininity · Lagos</p>
      </div>
      <button ref={skipButton} className="curtain-intro__skip" type="button" onClick={skip}>
        Skip intro
      </button>
    </div>
  );
}
