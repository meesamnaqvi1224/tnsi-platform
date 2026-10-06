/**
 * Keeps the chapter indicator in step with the page when the figure is the
 * static still (the scrolling scene drives the indicator itself): the
 * condition whose text crosses the middle of the viewport is the current one.
 * A plain state change — no animation — so it is safe under reduced motion.
 * Returns a function that stops it.
 */
export function trackChapters(root: HTMLElement): () => void {
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-cond-item]'));
  const lis = Array.from(root.querySelectorAll<HTMLElement>('[data-he-chapters] li'));
  if (items.length === 0 || lis.length === 0) return () => {};

  const crossing = new Set<number>();
  const apply = () => {
    const current = crossing.size > 0 ? Math.max(...crossing) : -1;
    lis.forEach((li, i) => {
      if (i === current) li.setAttribute('data-on', '');
      else li.removeAttribute('data-on');
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const index = items.indexOf(entry.target as HTMLElement);
        if (entry.isIntersecting) crossing.add(index);
        else crossing.delete(index);
      }
      apply();
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );
  items.forEach((item) => observer.observe(item));
  return () => observer.disconnect();
}
