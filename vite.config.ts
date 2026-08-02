import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // "prompt", no "autoUpdate" (offline-playback, "Actualizacion no
      // disruptiva"): autoUpdate reemplaza el service worker y recarga la
      // pagina en cuanto detecta una version nueva, sin mirar si hay audio
      // sonando. Con "prompt" la aplicacion decide cuando llamar a
      // `updateSW()` — ver src/main.tsx y src/platform/update.ts.
      registerType: "prompt",
      includeAssets: ["favicon.svg"],
      // Sin esto, `pnpm dev` no inyecta el <link rel="manifest"> ni registra
      // un service worker real (queda en un stub no-op), asi que el
      // navegador nunca ofrece instalar la app fuera de un build.
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: "Dark Echo",
        short_name: "dark-echo",
        description: "Generador offline de sonidos naturales procedurales.",
        theme_color: "#111111",
        background_color: "#111111",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],
});
