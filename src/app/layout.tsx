import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/Pwa";

export const metadata: Metadata = {
  title: { default: "Run-In-Out", template: "%s · Run-In-Out" },
  description: "Planes de entrenamiento adaptados a ti y a tu carrera, con estadísticas avanzadas y Strava.",
  applicationName: "Run-In-Out",
  appleWebApp: { capable: true, title: "Run-In-Out", statusBarStyle: "black-translucent" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  // el color de las barras (no el del fondo): el iPhone lo usa para lo que queda fuera de la página
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfb" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a19" },
  ],
  width: "device-width",
  initialScale: 1,
  // a pantalla completa en iPhone (barra de estado translúcida): los márgenes usan env(safe-area-inset-*)
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
