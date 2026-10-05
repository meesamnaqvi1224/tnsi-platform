'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@tnsi/ui';

/**
 * A very quiet reading-progress rail for the Human Expansion Theory™ page:
 * one hairline down the right edge, filling as the page is read, with a
 * small dot at each chapter. Desktop only, decorative (`aria-hidden`), no
 * labels, no icons, not interactive. It turns light while the current
 * chapter is a dark photograph (`data-tone="dark"`) so it never disappears.
 *
 * Chapters are discovered from `[data-chapter]` elements on the page. The
 * scroll handler is passive and throttled to one animation frame; the fill
 * is written straight to the DOM, and React state changes only when the
 * active chapter or tone actually changes.
 */
export function ChapterProgress() {
  const fillRef = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState<number[]>([]);
  const [active, setActive] = useState(0);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const chapters = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'));
    if (chapters.length === 0) return;

    let frame = 0;
    let tops: number[] = [];
    let lastActive = -1;
    let lastDark = false;

    const measure = () => {
      const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      tops = chapters.map((el) => el.getBoundingClientRect().top + window.scrollY);
      setMarks(tops.map((top) => Math.min(1, Math.max(0, top / scrollable))));
      update();
    };

    const update = () => {
      frame = 0;
      const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(1, Math.max(0, window.scrollY / scrollable));
      if (fillRef.current) fillRef.current.style.height = `${(progress * 100).toFixed(2)}%`;

      const line = window.scrollY + window.innerHeight * 0.4;
      let index = 0;
      tops.forEach((top, i) => {
        if (top <= line) index = i;
      });
      const isDark = chapters[index]?.dataset.tone === 'dark';
      if (index !== lastActive) {
        lastActive = index;
        setActive(index);
      }
      if (isDark !== lastDark) {
        lastDark = isDark;
        setDark(isDark);
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    // Images/fonts settling change the page height; re-measure once they have.
    window.addEventListener('load', measure);
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(document.body);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      window.removeEventListener('load', measure);
      resizeObserver.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed top-1/2 right-3 z-30 hidden h-[44vh] w-2 -translate-y-1/2 transition-opacity duration-500 lg:block xl:right-6',
        // The final chapter is the destination; the rail has done its job.
        marks.length > 0 && active === marks.length - 1 ? 'opacity-0' : 'opacity-100',
      )}
    >
      <div
        className={cn(
          'absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors duration-500',
          dark ? 'bg-white/30' : 'bg-foreground/15',
        )}
      />
      <div
        ref={fillRef}
        className={cn(
          'absolute top-0 left-1/2 w-px -translate-x-1/2 transition-colors duration-500',
          dark ? 'bg-white/80' : 'bg-foreground/60',
        )}
      />
      {marks.map((mark, index) => (
        <span
          key={index}
          style={{ top: `${mark * 100}%` }}
          className={cn(
            'absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500',
            index === active ? 'size-[7px]' : 'size-[4px]',
            dark
              ? index === active
                ? 'bg-white'
                : 'bg-white/50'
              : index === active
                ? 'bg-foreground'
                : 'bg-foreground/30',
          )}
        />
      ))}
    </div>
  );
}
