'use client';

import type { ReactNode } from 'react';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function CollectionsExperience({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      root.classList.add('collections-motion-ready');
      const opening = gsap.timeline({ defaults: { ease: 'power3.out' } });
      opening
        .from('.collections-intro__copy > *', {
          autoAlpha: 0,
          y: 28,
          duration: 0.78,
          stagger: 0.07,
        })
        .from(
          '.collections-intro__film figure',
          { autoAlpha: 0, x: 54, scale: 0.94, duration: 1, stagger: 0.08 },
          0.08,
        );

      gsap.utils.toArray<HTMLElement>('.collection-story').forEach((story) => {
        const image = story.querySelector<HTMLImageElement>('.collection-story__image img');
        gsap.from(story, {
          autoAlpha: 0,
          y: 56,
          scale: 0.985,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: story, start: 'top 84%', once: true },
        });
        if (image) {
          gsap.fromTo(
            image,
            { yPercent: -1, scale: 1.035 },
            {
              yPercent: 2,
              scale: 1.015,
              ease: 'none',
              scrollTrigger: { trigger: story, start: 'top bottom', end: 'bottom top', scrub: 0.7 },
            },
          );
        }
      });

      return () => root.classList.remove('collections-motion-ready');
    },
    { scope },
  );

  return <div ref={scope}>{children}</div>;
}
