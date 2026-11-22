import { useEffect, useRef, useState } from 'react';

/** cât trebuie tras în jos (px, după amortizare) ca să pornească reîmprospătarea */
export const PULL_TRIGGER = 72;
const PULL_MAX = 110;

/**
 * „Trage în jos ca să reîmprospătezi”, ca în aplicațiile de telefon.
 * Merge doar când pagina e derulată sus de tot și nu e deschis un panou/dialog.
 * Întoarce cât e tras acum (px) și dacă reîmprospătarea e în curs.
 */
export function usePullToRefresh(onRefresh: () => Promise<unknown>) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);
  const cb = useRef(onRefresh);
  cb.current = onRefresh;

  useEffect(() => {
    if (typeof window.matchMedia === 'function' && !window.matchMedia('(pointer: coarse)').matches) return;
    let startY = 0;
    let startX = 0;
    let active = false;
    let current = 0;

    const blocked = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el?.closest) return false;
      // în panouri, meniuri și liste derulabile nu interceptăm gestul
      return !!el.closest('[role="dialog"], [role="alertdialog"], [role="menu"], [data-no-pull]');
    };

    const onStart = (e: TouchEvent) => {
      if (busy.current || e.touches.length !== 1 || window.scrollY > 0 || blocked(e.target)) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      active = true;
      current = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (!active) return;
      const dy = e.touches[0].clientY - startY;
      const dx = e.touches[0].clientX - startX;
      // gest orizontal (ex. swipe pe card) sau în sus: nu e „pull”
      if (current === 0 && (Math.abs(dx) > Math.abs(dy) || dy < 0)) {
        if (Math.abs(dx) > 8 || dy < -8) active = false;
        return;
      }
      if (window.scrollY > 0) {
        active = false;
        current = 0;
        setPull(0);
        return;
      }
      // amortizare: cu cât tragi mai mult, cu atât se mișcă mai greu
      current = Math.min(PULL_MAX, Math.max(0, dy) * 0.5);
      if (current > 0 && e.cancelable) e.preventDefault();
      setPull(current);
    };
    const onEnd = () => {
      if (!active) return;
      active = false;
      if (current >= PULL_TRIGGER) {
        busy.current = true;
        setRefreshing(true);
        setPull(PULL_TRIGGER);
        navigator.vibrate?.(10);
        Promise.resolve(cb.current())
          .catch(() => undefined)
          .finally(() => {
            busy.current = false;
            setRefreshing(false);
            setPull(0);
          });
      } else {
        setPull(0);
      }
      current = 0;
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  return { pull, refreshing };
}
