import { useEffect, useRef } from 'react';

const DURATION = 600;

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

const getTargetPos = (): number =>
  document.documentElement.getAttribute('data-mantine-color-scheme') === 'dark' ? 0 : 100;

export const useBackgroundSwipe = () => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startTime: number | null = null;
    let fromPos = 100;
    let toPos = 100;
    let rafId = 0;

    const getCurrentPos = (): number => {
      const match = el.style.backgroundPosition.match(/([\d.]+)%$/);
      return match ? parseFloat(match[1]) : fromPos;
    };

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / DURATION, 1);
      el.style.backgroundPosition = `0% ${
        fromPos + (toPos - fromPos) * easeInOut(progress)
      }%`;
      if (progress < 1) rafId = requestAnimationFrame(step);
    };

    // Snap to correct initial position without animation
    toPos = getTargetPos();
    fromPos = toPos;
    el.style.backgroundPosition = `0% ${toPos}%`;

    const observer = new MutationObserver(() => {
      cancelAnimationFrame(rafId);
      fromPos = getCurrentPos();
      toPos = getTargetPos();
      startTime = null;
      rafId = requestAnimationFrame(step);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-mantine-color-scheme'],
    });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  return ref;
};
