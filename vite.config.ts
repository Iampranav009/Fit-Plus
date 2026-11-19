import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

// Fail the Vercel build early (instead of shipping a blank page) when the
// client-side Supabase settings are missing.
const REQUIRED_CLIENT_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'] as const;

export default defineConfig(({ mode }) => {
  if (process.env.VERCEL) {
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    const missing = REQUIRED_CLIENT_ENV.filter((k) => !env[k] && !process.env[k]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables for the Vercel build: ${missing.join(', ')}. ` +
          'Add them in Vercel → Project Settings → Environment Variables.',
      );
    }
  }
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'robots.txt', 'sitemap.xml'],
        manifest: {
          id: '/',
          name: 'FitPlus — Independent Personal Fitness Coaching',
          short_name: 'FitPlus',
          description:
            'India-first personal fitness coaching platform connecting independent trainers and clients.',
          theme_color: '#101218',
          background_color: '#101218',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          categories: ['fitness', 'health', 'lifestyle'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          globIgnores: ['**/exercises/**', '**/exercise-assets/**'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
              handler: 'NetworkOnly',
            },
            {
              urlPattern: ({ url }) =>
                url.pathname.includes('/exercises/') ||
                url.hostname.includes('raw.githubusercontent.com'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'exercise-media-cache',
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes('/node_modules/react/') ||
              id.includes('/node_modules/react-dom/') ||
              id.includes('/node_modules/react-router-dom/') ||
              id.includes('/node_modules/react-router/')
            ) {
              return 'react';
            }
            if (
              id.includes('/node_modules/firebase/') ||
              id.includes('/node_modules/@firebase/')
            ) {
              return 'firebase';
            }
            if (
              id.includes('/node_modules/motion/') ||
              id.includes('/node_modules/framer-motion/')
            ) {
              return 'motion';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
