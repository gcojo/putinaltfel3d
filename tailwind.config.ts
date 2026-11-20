import type { Config } from 'tailwindcss';

/**
 * Design tokens – stil „control room”.
 * Culorile de accent sunt folosite DOAR ca semnale de status.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000000', // doar pentru overlay-uri
      bg: '#0B0D10', // fundal aplicație
      surface: { DEFAULT: '#14171C', 2: '#1A1E24', 3: '#20252C' }, // carduri / hover
      line: { DEFAULT: '#22262D', strong: '#2E333B' }, // borduri subțiri
      fg: '#FFFFFF', // conținut normal
      muted: { DEFAULT: '#8A9099', 2: '#5C626B' }, // text secundar / terțiar
      critical: '#FF4747', // roșu – critic
      warning: '#F39444', // portocaliu – atenție
      ok: '#5EC557', // verde – operațional
    },
    fontFamily: {
      sans: ['"Helvetica Neue"', 'Helvetica', 'Inter', 'system-ui', 'sans-serif'],
    },
    // Scară tipografică strictă: [mărime, { lineHeight, letterSpacing }]
    fontSize: {
      micro: ['10px', { lineHeight: '12px', letterSpacing: '0.12em' }], // etichete uppercase
      xs: ['11px', { lineHeight: '14px' }],
      sm: ['12px', { lineHeight: '16px' }], // tabele
      base: ['13px', { lineHeight: '18px' }], // text normal
      md: ['15px', { lineHeight: '20px' }],
      lg: ['18px', { lineHeight: '24px' }], // titluri secțiuni
      xl: ['24px', { lineHeight: '28px' }], // titluri pagină
      kpi: ['40px', { lineHeight: '44px', letterSpacing: '-0.02em' }], // cifre KPI
      hero: ['56px', { lineHeight: '56px', letterSpacing: '-0.03em' }], // cifra principală
    },
    fontWeight: { light: '300', normal: '400', medium: '500' },
    extend: {
      spacing: { 4.5: '18px', 13: '52px', 15: '60px', 68: '272px' },
      borderRadius: { DEFAULT: '6px', card: '10px' },
      transitionDuration: { DEFAULT: '150ms', 150: '150ms', 200: '200ms' },
      keyframes: {
        'soft-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(94,197,87,0.55)' },
          '50%': { boxShadow: '0 0 0 5px rgba(94,197,87,0)' },
        },
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        shimmer: { '0%': { opacity: '0.45' }, '50%': { opacity: '0.8' }, '100%': { opacity: '0.45' } },
      },
      animation: {
        'soft-pulse': 'soft-pulse 2s ease-in-out infinite',
        'slide-in': 'slide-in 200ms ease-out',
        'fade-in': 'fade-in 150ms ease-out',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
