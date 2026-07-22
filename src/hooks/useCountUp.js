import { useEffect, useRef, useState } from "react";

/**
 * Counts a number up to `target` once its element scrolls into view.
 * Returns [value, ref]. Respects prefers-reduced-motion (jumps to target).
 */
export function useCountUp(target, { duration = 1200 } = {}) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      setValue(target);
      return;
    }

    let frameId = null;
    let startTime = null;

    const step = (now) => {
      if (startTime === null) startTime = now;
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(target * eased);
      if (progress < 1) frameId = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          frameId = requestAnimationFrame(step);
          observer.unobserve(el);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [target, duration]);

  return [value, ref];
}
