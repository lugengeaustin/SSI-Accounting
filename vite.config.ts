import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "SSI Accounting",
        short_name: "SSI Acct",
        description: "Sub-Sahara Institute — accounting system of record",
        theme_color: "#1E3FA0",
        background_color: "#F4F6FA",
        display: "standalone",
        start_url: "/",
        icons: [
          // Add real icons to /public and reference them here for full install support:
          // { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          // { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" }
        ],
      },
      workbox: {
        navigateFallback: "index.html",
        globPatterns: ["**/*.{js,css,html,woff2}"],
      },
    }),
  ],
  server: { port: 5173 },
});
