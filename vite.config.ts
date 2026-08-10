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
        // "dark echo" es el nombre visible (visual-identity, "Nombre y marca
        // del producto"); "dark-echo" se conserva como identificador tecnico
        // estable en `short_name`, independiente de la presentacion.
        name: "dark echo",
        short_name: "dark-echo",
        description:
          "Ambientes sonoros procedurales y offline, con sonidos como fichas táctiles y consola de comandos.",
        // Mismo valor que --background del esquema oscuro en tokens.css
        // (visual-identity, "La ventana instalada no desentona"): la
        // ventana instalada no puede mostrar un borde de color distinto del
        // de la propia interfaz.
        theme_color: "#0e1217",
        background_color: "#0e1217",
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
          {
            src: "/pwa-512x512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // "woff2" cubre la tipografia propia empaquetada (theming,
        // "Tipografia propia empaquetada"): sin ella en el precache, la
        // primera carga sin conexion se quedaria sin la marca tipografica.
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
      },
    }),
  ],
});
