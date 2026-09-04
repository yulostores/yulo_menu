import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// This app only ever calls the public /api/restaurants/* routes (see API.md and
// yulo_backend/server/routes/restaurant.routes.js) — no auth, no other prefixes needed.
const BACKEND = process.env.VITE_PROXY_TARGET ?? "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5174,
    proxy: {
      "/api": BACKEND,
    },
  },
  preview: {
    rewrites: [
      {
        source: "/(.*)",
        destination: "/index.html",
      },
    ],
  },
});
