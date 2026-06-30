'use client';

import { useEffect, useState } from 'react';

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function updateProgress() {
      const article = document.getElementById('article-content');
      if (!article) {
        return;
      }

      const rect = article.getBoundingClientRect();
      const articleTop = rect.top + window.scrollY;
      const articleHeight = article.offsetHeight;
      const viewportBottom = window.scrollY + window.innerHeight;
      const scrolled = viewportBottom - articleTop;
      const total = articleHeight + window.innerHeight * 0.25;
      const value = Math.min(100, Math.max(0, (scrolled / total) * 100));

      setProgress(value);
    }

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);

    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="bg-border fixed top-0 right-0 left-0 z-50 h-0.5"
      role="presentation"
    >
      <div
        className="bg-foreground h-full transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
