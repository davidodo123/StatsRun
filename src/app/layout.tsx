import type { Metadata, Viewport } from "next";
import { Anton, Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/Pwa";
import { NativeBridge } from "@/components/NativeBridge";
import { RotateHint } from "@/components/RotateHint";

// estilo Volt (elegido por David 2026-10-24): Inter para el texto y Anton, condensada, solo en títulos y cifras grandes
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const heading = Anton({ subsets: ["latin"], weight: "400", variable: "--font-heading", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Zancavolt", template: "%s · Zancavolt" },
  description: "Planes de entrenamiento adaptados a ti y a tu carrera, con estadísticas avanzadas y Strava.",
  applicationName: "Zancavolt",
  appleWebApp: { capable: true, title: "Zancavolt", statusBarStyle: "black-translucent" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  // el color de las barras (no el del fondo): el iPhone lo usa para lo que queda fuera de la página
  themeColor: "#0f0f0f",
  width: "device-width",
  initialScale: 1,
  // a pantalla completa en iPhone (barra de estado translúcida): los márgenes usan env(safe-area-inset-*)
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`h-full antialiased ${body.variable} ${heading.variable}`}>
      <body className="flex min-h-full">
        {children}
        <ServiceWorkerRegister />
        <NativeBridge />
        <RotateHint />
      </body>
    </html>
  );
}
