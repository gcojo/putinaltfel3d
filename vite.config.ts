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
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'heart-128.png', 'heart-256.png', 'heart-512.png'],
      manifest: {
        name: 'Răzvan Tofan · putinALTFEL 3D',
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
      },
      workbox: {
        navigateFallback: `${base}index.html`,
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
