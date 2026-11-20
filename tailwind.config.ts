import type { Config } from 'tailwindcss';

/**
 * Design tokens – stil „glass dashboard” (inspirat de Vexto).
 * Suprafețele sunt semi-transparente peste un fundal cu gradient; accentul
 * violet/cyan e pentru navigare și acțiuni, culorile de semnal rămân pentru status.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000000', // doar pentru overlay-uri
      white: '#FFFFFF',
      bg: '#070812', // fundal aplicație (sub gradient)
      // sticlă: alb translucid peste fundal
      surface: { DEFAULT: 'rgba(255,255,255,0.045)', 2: 'rgba(255,255,255,0.075)', 3: 'rgba(255,255,255,0.11)' },
      line: { DEFAULT: 'rgba(255,255,255,0.08)', strong: 'rgba(255,255,255,0.16)' }, // borduri subțiri
      panel: 'rgba(16,18,34,0.78)', // panouri aproape opace (modale, meniuri, tooltip-uri)
      fg: '#FFFFFF', // conținut normal
      muted: { DEFAULT: '#9298AE', 2: '#5F6580' }, // text secundar / terțiar
      accent: { DEFAULT: '#8B7BFF', 2: '#38D5F5', 3: '#E879F9' }, // violet / cyan / roz
      critical: '#FF4D6A', // roșu – critic
      warning: '#FFA94D', // portocaliu – atenție
      ok: '#4ADE80', // verde – operațional
    },
    fontFamily: {
      sans: ['Inter', '"Helvetica Neue"', 'Helvetica', 'system-ui', 'sans-serif'],
    },
    // Scară tipografică strictă: [mărime, { lineHeight, letterSpacing }]
    fontSize: {
      micro: ['10px', { lineHeight: '12px', letterSpacing: '0.12em' }], // etichete uppercase
      xs: ['11px', { lineHeight: '14px' }],
      sm: ['12px', { lineHeight: '16px' }], // tabele
      base: ['13px', { lineHeight: '18px' }], // text normal
      md: ['15px', { lineHeight: '20px' }],
      lg: ['18px', { lineHeight: '24px' }], // titluri secțiuni
      xl: ['26px', { lineHeight: '32px', letterSpacing: '-0.01em' }], // titluri pagină
      kpi: ['40px', { lineHeight: '44px', letterSpacing: '-0.02em' }], // cifre KPI
      hero: ['56px', { lineHeight: '56px', letterSpacing: '-0.03em' }], // cifra principală
    },
    fontWeight: { light: '300', normal: '400', medium: '500', semibold: '600' },
    extend: {
      spacing: { 4.5: '18px', 13: '52px', 15: '60px', 68: '272px' },
      borderRadius: { DEFAULT: '10px', card: '20px', tile: '14px' },
      transitionDuration: { DEFAULT: '150ms', 150: '150ms', 200: '200ms', 300: '300ms', 500: '500ms' },
      transitionTimingFunction: { spring: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      boxShadow: {
        glass: 'inset 0 1px 0 0 rgba(255,255,255,0.07), 0 10px 40px -14px rgba(0,0,0,0.65)',
        'glass-lg': 'inset 0 1px 0 0 rgba(255,255,255,0.09), 0 30px 80px -20px rgba(0,0,0,0.8)',
        glow: '0 0 0 1px rgba(139,123,255,0.45), 0 10px 30px -8px rgba(139,123,255,0.6)',
      },
      keyframes: {
        'soft-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(74,222,128,0.6)' },
          '50%': { boxShadow: '0 0 0 6px rgba(74,222,128,0)' },
        },
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop-in': { from: { opacity: '0', transform: 'translateY(8px) scale(0.97)' }, to: { opacity: '1', transform: 'none' } },
        rise: { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'none' } },
        shimmer: { '0%': { opacity: '0.45' }, '50%': { opacity: '0.8' }, '100%': { opacity: '0.45' } },
        drift: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '33%': { transform: 'translate3d(6vw,-5vh,0) scale(1.1)' },
          '66%': { transform: 'translate3d(-5vw,6vh,0) scale(0.94)' },
        },
        sheen: { from: { transform: 'translateX(-120%)' }, to: { transform: 'translateX(220%)' } },
      },
      animation: {
        'soft-pulse': 'soft-pulse 2s ease-in-out infinite',
        'slide-in': 'slide-in 340ms cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in': 'fade-in 220ms ease-out',
        'pop-in': 'pop-in 280ms cubic-bezier(0.22, 1, 0.36, 1)',
        rise: 'rise 560ms cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
        drift: 'drift 30s ease-in-out infinite',
        sheen: 'sheen 900ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
