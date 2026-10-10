import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // el indicador de desarrollo tapaba «Cerrar sesión» en la barra lateral (abajo a la izquierda)
  devIndicators: { position: "bottom-right" },
  partialPrefetching: true,
  experimental: {
    // volver a una pestaña ya vista en los últimos 30 s es instantáneo; las acciones que guardan datos la refrescan igual
    staleTimes: { dynamic: 30 },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
