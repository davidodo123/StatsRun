import type { MetadataRoute } from "next";

// Iconos PNG generados con scripts/generate-icons.mjs (iOS y Android no usan el SVG en la pantalla de inicio).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Zancavolt — Entrenamiento y estadísticas",
    short_name: "Zancavolt",
    description: "Planes de running adaptados a ti y a tu carrera, con Strava.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait", // la app instalada en Android no gira (el iPhone no lo respeta: ver .rotate-hint)
    background_color: "#0f0f0f", // el de las barras: lo que el iPhone pinta fuera de la página (bajo la barra de abajo)
    theme_color: "#000000",
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
