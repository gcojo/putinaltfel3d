import { useEffect, useRef, useState } from 'react';

const reducedMotion = () =>
  typeof window === 'undefined' || typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Cifra „numără” de la valoarea anterioară (0 la prima afișare) până la cea nouă,
 * cu încetinire spre final. Fără animație dacă utilizatorul a cerut mai puțină mișcare.
 */
export function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(() => (reducedMotion() ? target : 0));
  const from = useRef(reducedMotion() ? target : 0);

  useEffect(() => {
    if (reducedMotion() || typeof requestAnimationFrame !== 'function') {
      from.current = target;
      setValue(target);
      return;
    }
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(2, -10 * p); // easeOutExpo
      const v = start + (target - start) * (p === 1 ? 1 : eased);
      from.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
