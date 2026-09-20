'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { Market } from '@/lib/vendure/channels';

gsap.registerPlugin(useGSAP);

export function AuthPortal({
  market,
  mode,
  title,
  intro,
  children,
  aside,
}: {
  market: Market;
  mode: 'login' | 'register';
  title: string;
  intro: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const timeline = gsap.timeline({ defaults: { ease: 'power4.out' } });
      timeline
        .fromTo('.auth-stage__visual', { clipPath: 'inset(0 100% 0 0 round 28px)' }, { clipPath: 'inset(0 0% 0 0 round 28px)', duration: 0.82 })
        .fromTo('.auth-stage__portrait', { scale: 1.08, filter: 'grayscale(1)' }, { scale: 1, filter: 'grayscale(0)', duration: 1.05 }, 0)
        .fromTo('.auth-stage__form', { opacity: 0, xPercent: 4 }, { opacity: 1, xPercent: 0, duration: 0.58 }, 0.2)
        .fromTo('.auth-stage__measure span', { opacity: 0, y: 8 }, { opacity: 1, y: 0, stagger: 0.06, duration: 0.34 }, 0.5);
    },
    { scope: root },
  );

  const image = mode === 'login' ? '/editorial/live/adele-02.webp' : '/editorial/live/linear-tokyo-2400.jpg';

  return (
    <div className="auth-stage" ref={root}>
      <div className="auth-stage__visual">
        <Image
          className="auth-stage__portrait"
          src={image}
          alt="A NELO Woman campaign portrait."
          fill
          priority
          sizes="(max-width: 900px) 100vw, 48vw"
        />
        <div className="auth-stage__shade" />
        <div className="auth-stage__measure" aria-hidden="true">
          <span>01 / PROFILE</span>
          <span>LAGOS / PRIVATE</span>
          <span>CUT TO 0.01 MM</span>
        </div>
        <div className="auth-stage__aside">{aside}</div>
      </div>

      <div className="auth-stage__form">
        <nav className="auth-switch" aria-label="Account access">
          <Link href={`/${market}/account/login`} aria-current={mode === 'login' ? 'page' : undefined}>Sign in</Link>
          <Link href={`/${market}/account/register`} aria-current={mode === 'register' ? 'page' : undefined}>Create account</Link>
        </nav>
        <div className="auth-stage__heading">
          <span className="lab">NELO profile</span>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
        <div className="authwrap">{children}</div>
      </div>
    </div>
  );
}
