// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      // show "update available" prompt from the SW
      registerType: "prompt",
      devOptions: { enabled: false }, // keep SW off in dev

      includeAssets: [
        "offline.html",
        "favicon.ico",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/maskable-512.png",
      ],

      manifest: {
        id: "/?source=pwa",
        name: "Neshama Flow",
        short_name: "Neshama",
        description: "Daily micro-rituals to track moods and build mindful streaks.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["standalone", "browser"],
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Log mood", url: "/log", description: "Open the mood logger" },
          { name: "History", url: "/history", description: "See recent sessions" },
          { name: "Insights", url: "/insights", description: "View trends (Pro)" },
        ],
        categories: ["health", "productivity", "lifestyle"],
      },

      workbox: {
        navigateFallback: "/offline.html",
        navigateFallbackDenylist: [/^\/auth/i, /^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Allow your System theme photo host(s)
            urlPattern: ({ url }) =>
              /^https:\/\/(images|plus)\.unsplash\.com\/.*/i.test(url.href) ||
              /^https:\/\/source\.unsplash\.com\/.*/i.test(url.href),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "ext-images-v2", // bump to clear any stale entries
              cacheableResponse: { statuses: [0, 200] }, // opaque & OK
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 14, // 14 days
              },
              // default matchOptions keeps query string so ?v= works as a cache-buster
            },
          },
        ],
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],

  // Dev-server config only applies in development
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    ...(mode === "development"
      ? {
          allowedHosts: true, // allow tunnels (*.pages.dev, *.loca.lt, etc.)
          hmr: {
            protocol: "ws",
            // If you use an HTTPS tunnel with a custom port, uncomment:
            // clientPort: Number(process.env.VITE_HMR_CLIENT_PORT) || undefined,
          },
        }
      : {}),
  },
}));
