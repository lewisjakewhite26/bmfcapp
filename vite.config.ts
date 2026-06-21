import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const e2eMode = process.env.VITE_E2E === 'true'

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'logo.png',
        'pwa-192.png',
        'pwa-512.png',
        'pwa-512-maskable.png',
        'pwa-badge-96.png',
        'notification-badge.svg',
        'apple-touch-icon.png',
      ],
      manifest: {
        name: 'BMFC Club Hub',
        short_name: 'BMFC',
        description: 'Bishop Middleham FC — fixtures, stats, availability & more',
        theme_color: '#2B5FC0',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '/dashboard',
        scope: '/',
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false,
      devOptions: {
        enabled: !e2eMode,
        type: 'module',
      },
    }),
  ],
})
