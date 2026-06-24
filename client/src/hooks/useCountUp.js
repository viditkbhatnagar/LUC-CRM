import { useEffect, useRef, useState } from 'react';

// Animates a number from 0 → value once (respects reduced-motion).
export function useCountUp(value, duration = 700) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(0);
  const from = useRef(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setDisplay(target);
      return undefined;
    }
    const start = performance.now();
    const begin = from.current;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(begin + (target - begin) * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return display;
}
