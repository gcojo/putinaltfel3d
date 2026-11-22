import type { Config } from 'tailwindcss';

/** Culoare dintr-o variabilă CSS cu triplet RGB – suportă modificatori de opacitate (`bg-fg/50`). */
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

/**
 * Design tokens – identitatea „putinALTFEL” (razvantofan.ro), departamentul de printare 3D.
 * Valorile reale stau în variabile CSS (src/index.css): `:root` = tema crem, `.dark` = tema închisă.
 * Roșul de brand e același în ambele teme.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000000', // overlay-uri
      white: '#FFFFFF', // text pe roșu
      ink: v('ink'), // nuanță de contrast pentru fundaluri subtile (închisă pe crem, deschisă pe întuneric)
      glass: v('glass'), // materialul sticlei: alb pe crem, maro-cald închis pe întuneric
      // muchia luminoasă a sticlei: alb, mult mai discret în tema închisă
      edge: 'rgb(255 255 255 / calc(<alpha-value> * var(--edge-k)))',
      bg: v('bg'),
      'bg-soft': v('bg-soft'),
      surface: { DEFAULT: 'var(--surface)', 2: 'var(--surface-2)', 3: 'var(--surface-3)' },
      line: { DEFAULT: 'var(--line)', strong: 'var(--line-strong)' }, // borduri subțiri
      panel: 'var(--panel)', // panouri plutitoare (modale, meniuri, tooltip-uri)
      fg: v('fg'), // conținut normal
      muted: { DEFAULT: v('muted'), 2: v('muted-2') }, // text secundar / terțiar
      accent: { DEFAULT: '#D8423F', 2: '#F08A6C', 3: '#F5B001', soft: '#B8332F' }, // roșu brand / piersică / auriu
      critical: v('critical'), // roșu – critic
      warning: v('warning'), // portocaliu – atenție
      ok: v('ok'), // verde – operațional
    },
    fontFamily: {
      sans: ['"Plus Jakarta Sans"', '-apple-system', 'system-ui', 'sans-serif'],
      display: ['"Playfair Display"', 'Georgia', 'serif'],
    },
    // Scară tipografică strictă: [mărime, { lineHeight, letterSpacing }]
    fontSize: {
      micro: ['11px', { lineHeight: '14px', letterSpacing: '0.16em' }], // etichete uppercase
      xs: ['12px', { lineHeight: '16px' }],
      sm: ['13px', { lineHeight: '18px' }], // tabele
      base: ['14px', { lineHeight: '20px' }], // text normal
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
        glass: 'var(--shadow-glass)',
        'glass-lg': 'var(--shadow-glass-lg)',
        lift: 'var(--shadow-lift)',
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
          '0%, 100%': { transform: 'scale(1)' },
          '8%': { transform: 'scale(1.08)' },
          '16%': { transform: 'scale(1)' },
          '24%': { transform: 'scale(1.05)' },
          '34%': { transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'rotate(-12deg) translateY(0)' },
          '50%': { transform: 'rotate(-8deg) translateY(-18px)' },
        },
        sheen: { from: { transform: 'translateX(-120%)' }, to: { transform: 'translateX(220%)' } },
        // iconița din meniu se clatină scurt la hover
        wiggle: {
          '0%, 100%': { transform: 'rotate(0) scale(1)' },
          '25%': { transform: 'rotate(-12deg) scale(1.12)' },
          '50%': { transform: 'rotate(9deg) scale(1.12)' },
          '75%': { transform: 'rotate(-4deg) scale(1.06)' },
        },
        // iconița activă „sare” când intri pe pagină
        'bounce-once': {
          '0%': { transform: 'translateY(0) scale(1)' },
          '35%': { transform: 'translateY(-5px) scale(1.15)' },
          '65%': { transform: 'translateY(1px) scale(0.96)' },
          '100%': { transform: 'translateY(0) scale(1)' },
        },
        // cuvintele din titlu urcă din spatele unei măști
        'reveal-up': { from: { transform: 'translateY(105%) rotate(4deg)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        // inel care se extinde în jurul butonului rapid
        'ring-pulse': {
          '0%': { transform: 'scale(1)', opacity: '0.55' },
          '80%, 100%': { transform: 'scale(1.75)', opacity: '0' },
        },
        // bara de timp a notificării se golește
        countdown: { from: { transform: 'scaleX(1)' }, to: { transform: 'scaleX(0)' } },
        // notificarea intră din dreapta, cu mic arc
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateX(40px) scale(0.94)' },
          '60%': { opacity: '1', transform: 'translateX(-4px) scale(1.01)' },
          '100%': { opacity: '1', transform: 'none' },
        },
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
        wiggle: 'wiggle 520ms ease-in-out',
        'bounce-once': 'bounce-once 600ms cubic-bezier(.4,.1,.3,1.4)',
        'reveal-up': 'reveal-up 700ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'ring-pulse': 'ring-pulse 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite',
        countdown: 'countdown linear forwards',
        'toast-in': 'toast-in 460ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
} satisfies Config;
