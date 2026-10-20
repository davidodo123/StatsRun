import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/Pwa";
import { NativeBridge } from "@/components/NativeBridge";

// estilo deportivo: texto en Barlow y cifras y títulos en Barlow Condensed, como un marcador de carrera
const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });
const display = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display-face", display: "swap" });

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
    <html lang="es" className={`h-full antialiased ${body.variable} ${display.variable}`}>
      <body className="flex min-h-full">
        {children}
        <ServiceWorkerRegister />
        <NativeBridge />
        {/* el iPhone no deja bloquear el giro en la app instalada: en horizontal se pide volver a vertical */}
        <div className="rotate-hint" role="alert">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="7" y="2" width="10" height="20" rx="2" />
            <path d="M11 18h2" />
          </svg>
          <p>Gira el móvil: Run-In-Out se usa en vertical.</p>
        </div>
      </body>
    </html>
  );
}
