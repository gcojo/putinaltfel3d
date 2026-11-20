import type { Config } from 'tailwindcss';

/**
 * Design tokens – identitatea „putinALTFEL” (razvantofan.ro), departamentul de printare 3D.
 * Fundal crem cald, cerneală aproape neagră, roșu de brand; carduri de sticlă albă translucidă.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000000', // doar pentru overlay-uri
      white: '#FFFFFF',
      ink: '#1A1714', // baza pentru umbre / nuanțe translucide
      bg: '#FAF7F1', // crem (fundalul site-ului)
      'bg-soft': '#F2EDE2',
      // sticlă: alb translucid peste fundalul crem
      surface: { DEFAULT: 'rgba(255,255,255,0.58)', 2: 'rgba(255,255,255,0.82)', 3: 'rgba(255,255,255,0.95)' },
      line: { DEFAULT: 'rgba(26,23,20,0.09)', strong: 'rgba(26,23,20,0.18)' }, // borduri subțiri
      panel: 'rgba(255,253,249,0.9)', // panouri plutitoare (modale, meniuri, tooltip-uri)
      fg: '#1A1714', // conținut normal
      muted: { DEFAULT: '#6B6660', 2: '#A39D95' }, // text secundar / terțiar
      accent: { DEFAULT: '#D8423F', 2: '#F08A6C', 3: '#F5B001', soft: '#B8332F' }, // roșu brand / piersică / auriu
      critical: '#C62F2C', // roșu – critic
      warning: '#D98324', // portocaliu – atenție
      ok: '#3E9B5C', // verde – operațional
    },
    fontFamily: {
      sans: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
      display: ['"Playfair Display"', 'Georgia', 'serif'],
    },
    // Scară tipografică strictă: [mărime, { lineHeight, letterSpacing }]
    fontSize: {
      micro: ['10px', { lineHeight: '12px', letterSpacing: '0.16em' }], // etichete uppercase
      xs: ['11px', { lineHeight: '14px' }],
      sm: ['12px', { lineHeight: '16px' }], // tabele
      base: ['13px', { lineHeight: '18px' }], // text normal
      md: ['15px', { lineHeight: '20px' }],
      lg: ['18px', { lineHeight: '24px' }], // titluri secțiuni
      xl: ['34px', { lineHeight: '38px', letterSpacing: '-0.02em' }], // titluri pagină (Playfair)
      kpi: ['40px', { lineHeight: '44px', letterSpacing: '-0.02em' }], // cifre KPI
      hero: ['56px', { lineHeight: '56px', letterSpacing: '-0.03em' }], // cifra principală
    },
    fontWeight: { light: '300', normal: '400', medium: '500', semibold: '600' },
    extend: {
      spacing: { 4.5: '18px', 13: '52px', 15: '60px', 68: '272px' },
      borderRadius: { DEFAULT: '10px', card: '20px', tile: '14px' },
      transitionDuration: { DEFAULT: '150ms', 150: '150ms', 200: '200ms', 300: '300ms', 500: '500ms' },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
        bounce: 'cubic-bezier(.4,.1,.3,1.4)', // la fel ca logo-ul de pe site
      },
      boxShadow: {
        glass: 'inset 0 1px 0 0 rgba(255,255,255,0.9), 0 1px 2px rgba(40,30,20,0.04), 0 14px 40px -18px rgba(40,30,20,0.18)',
        'glass-lg': 'inset 0 1px 0 0 rgba(255,255,255,0.9), 0 30px 80px -24px rgba(40,30,20,0.32)',
        lift: '0 18px 40px -18px rgba(40,30,20,0.25)',
        glow: '0 10px 26px -10px rgba(216,66,63,0.65)',
        sticker: '0 6px 14px rgba(40,30,20,0.18), 0 2px 4px rgba(40,30,20,0.12)',
      },
      dropShadow: {
        sticker: ['0 6px 14px rgba(40,30,20,0.18)', '0 2px 4px rgba(40,30,20,0.12)'],
      },
      keyframes: {
        'soft-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(62,155,92,0.55)' },
          '50%': { boxShadow: '0 0 0 6px rgba(62,155,92,0)' },
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
        // inimioara „bate” ușor și se balansează
        heartbeat: {
          '0%, 100%': { transform: 'rotate(-6deg) scale(1)' },
          '8%': { transform: 'rotate(-6deg) scale(1.08)' },
          '16%': { transform: 'rotate(-6deg) scale(1)' },
          '24%': { transform: 'rotate(-6deg) scale(1.05)' },
          '34%': { transform: 'rotate(-6deg) scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'rotate(-12deg) translateY(0)' },
          '50%': { transform: 'rotate(-8deg) translateY(-18px)' },
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
        heartbeat: 'heartbeat 2.6s ease-in-out infinite',
        float: 'float 14s ease-in-out infinite',
        sheen: 'sheen 900ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
