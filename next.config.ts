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
    // las fotos de los entrenos llegan reducidas (~150-300 KB), pero con el resto del formulario pueden pasar de 1 MB
    serverActions: { bodySizeLimit: "2mb" },
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
