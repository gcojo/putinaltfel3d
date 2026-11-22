/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// Pe GitHub Pages site-ul stă într-un subfolder (ex. /putinaltfel3d/); workflow-ul setează BASE_PATH.
// Local, Firebase, Cloudflare, Netlify: rădăcina „/”.
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // înregistrarea se face din src/main.tsx (cu verificare periodică de versiune nouă)
      injectRegister: false,
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'heart-128.png', 'heart-256.png', 'heart-512.png'],
      manifest: {
        name: 'putinaltfel3d',
        short_name: 'Print 3D',
        description: 'Panou de administrare pentru printare 3D',
        lang: 'ro',
        theme_color: '#FAF7F1',
        background_color: '#FAF7F1',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // ține apăsat pe iconița aplicației: scurtături directe
        shortcuts: [
          { name: 'Comandă nouă', short_name: 'Comandă nouă', url: `${base}?nou=1`, icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Coadă de printare', short_name: 'Coadă', url: `${base}coada`, icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Comenzi', short_name: 'Comenzi', url: `${base}comenzi`, icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Filament', short_name: 'Filament', url: `${base}filament`, icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }] },
        ],
      },
      workbox: {
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Datele din Supabase nu se pun în cache: aplicația arată mereu date proaspete.
        runtimeCaching: [],
      },
    }),
  ],
  build: {
    // paginile secundare sunt încărcate la cerere (lazy), restul e un singur bundle
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
