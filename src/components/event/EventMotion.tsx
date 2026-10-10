'use client';

import { useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Scoped event choreography. The static markup stays usable without animation. */
export default function EventMotion({ children, theme }: { children: ReactNode; theme: 'light' | 'dark' }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const intro = gsap.timeline({ defaults: { duration: 0.7, ease: 'power3.out' } });
      // Keep the main artwork visible immediately for the first meaningful paint.
      intro.from('.ccd-hero__logo', { y: 26, rotation: -3 })
        .from('.ccd-hero__cat-entry', { x: 50, y: 20, rotation: 5 }, 0.12)
        .from('.ccd-hero__date, .ccd-hero__desc, .ccd-hero__cta', { y: 16, opacity: 0, stagger: 0.08 }, 0.22)
        .from('.ccd-countdown__item', { y: 12, opacity: 0, stagger: 0.06 }, 0.38);

      root.current?.querySelectorAll<HTMLElement>('[data-reveal]').forEach((group) => {
        gsap.from(group.children, {
          y: 28, opacity: 0, duration: 0.75, stagger: 0.1, ease: 'power3.out',
          scrollTrigger: { trigger: group, start: 'top 88%', once: true },
        });
      });

      root.current?.querySelectorAll<HTMLElement>('[data-cat-reveal]').forEach((cat) => {
        gsap.from(cat, {
          y: 45, rotation: -5, opacity: 0, duration: 0.9, ease: 'back.out(1.25)',
          scrollTrigger: { trigger: cat, start: 'top 90%', once: true },
        });
      });

    });

    // Separate media contexts avoid accumulating handlers on preference changes.
    // An inner image keeps entrance and scroll motion on different transforms.
    media.add('(min-width: 861px) and (prefers-reduced-motion: no-preference)', () => {
      gsap.to('.ccd-hero__cat', {
        y: -45, rotation: -3, ease: 'none',
        scrollTrigger: { trigger: '.ccd-hero', start: 'top top', end: 'bottom top', scrub: 1 },
      });
    });

    let mounted = true;
    const refresh = () => { if (mounted) ScrollTrigger.refresh(); };
    // Images reserve their aspect ratio. Refreshing for lazy images during an
    // anchor scroll would interrupt the browser's native smooth scrolling.
    void document.fonts.ready.then(refresh);
    return () => {
      mounted = false;
      media.revert();
    };
  }, { scope: root });

  return <div ref={root} className="ccd" data-theme={theme}>{children}</div>;
}
