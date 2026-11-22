import { useEffect } from 'react';

type BadgeNavigator = Navigator & {
  setAppBadge?: (n?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/** Cifra de pe iconița aplicației instalate (unde browserul o suportă). 0 = fără cifră. */
export function useAppBadge(count: number) {
  useEffect(() => {
    const nav = navigator as BadgeNavigator;
    if (!nav.setAppBadge) return;
    const p = count > 0 ? nav.setAppBadge(count) : nav.clearAppBadge?.();
    p?.catch(() => undefined);
  }, [count]);
}
