import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'theme';
/** Culoarea barei de sistem (telefon) pentru fiecare temă. */
const THEME_COLOR: Record<Theme, string> = { light: '#FAF7F1', dark: '#171210' };

const listeners = new Set<() => void>();

function read(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** Aplică tema pe <html>. Tema e setată și înainte de primul render, din scriptul din index.html. */
function apply(theme: Theme, animate: boolean) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theme-switching');
    window.setTimeout(() => root.classList.remove('theme-switching'), 450);
  }
  root.classList.toggle('dark', theme === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* stocare indisponibilă */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Tema curentă (crem / închisă) + comutator. Alegerea se păstrează pe dispozitiv. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read, () => 'light' as Theme);
  return {
    theme,
    isDark: theme === 'dark',
    toggle: () => apply(theme === 'dark' ? 'light' : 'dark', true),
  };
}
