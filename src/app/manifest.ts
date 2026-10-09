import type { MetadataRoute } from "next";

// Iconos PNG generados con scripts/generate-icons.mjs (iOS y Android no usan el SVG en la pantalla de inicio).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Run-In-Out — Entrenamiento y estadísticas",
    short_name: "Run-In-Out",
    description: "Planes de running adaptados a ti y a tu carrera, con Strava.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0d0d0d",
    theme_color: "#eb6834",
    lang: "es",
    categories: ["sports", "health", "fitness"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // mantener pulsado el icono: accesos directos
    shortcuts: [
      { name: "Registrar entreno", short_name: "Registrar", url: "/registrar", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Mi plan", short_name: "Plan", url: "/plan", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Amigos", url: "/amigos", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
