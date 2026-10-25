import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // el indicador de desarrollo tapaba «Cerrar sesión» en la barra lateral (abajo a la izquierda)
  devIndicators: { position: "bottom-right" },
  partialPrefetching: true,
  // métricas de PostHog (servidor de Europa) por la propia web: así no las cortan los bloqueadores
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: "https://eu-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/array/:path*", destination: "https://eu-assets.i.posthog.com/array/:path*" },
      { source: "/ingest/:path*", destination: "https://eu.i.posthog.com/:path*" },
    ];
  },
  skipTrailingSlashRedirect: true,
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
