import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // ⬇️ prompt so we can show "Update available" UI
      registerType: 'prompt',
      devOptions: { enabled: false }, // keep SW off in dev
      includeAssets: [
        'offline.html',
        'favicon.ico',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/maskable-512.png',
      ],
      manifest: {
        id: '/?source=pwa',
        name: 'Neshama Flow',
        short_name: 'Neshama',
        description: 'Daily micro-rituals to track moods and build mindful streaks.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'browser'],
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Log mood', url: '/log', description: 'Open the mood logger' },
          { name: 'History', url: '/history', description: 'See recent sessions' },
          { name: 'Insights', url: '/insights', description: 'View trends (Pro)' },
        ],
        categories: ['health', 'productivity', 'lifestyle'],
      },
      workbox: {
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/auth/i, /^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              /^https:\/\/[^/]+\.supabase\.co\/(auth|rest)\/v1\//.test(url.href),
            handler: 'NetworkOnly',
            options: { cacheName: 'sb-network-only' },
          },
        ],
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],

  // Dev-server tweaks so tunnels work
  server: {
    host: true,        // listen on all interfaces so LAN/tunnel can reach it
    port: 5173,
    strictPort: true,  // fail fast if the port is taken
    allowedHosts: true, // DEV ONLY: allow any hostname (e.g. *.trycloudflare.com, *.loca.lt)
    hmr: {
      clientPort: 443, // for HTTPS tunnels
    },
  },
})
