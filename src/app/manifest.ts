import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PaceLab — Entrenamiento y estadísticas",
    short_name: "PaceLab",
    description: "Planes de running adaptados a ti y a tu carrera, con Strava.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d0d",
    theme_color: "#eb6834",
    lang: "es",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
