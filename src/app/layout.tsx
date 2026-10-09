import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PaceLab", template: "%s · PaceLab" },
  description: "Planes de entrenamiento adaptados a ti y a tu carrera, con estadísticas avanzadas y Strava.",
  applicationName: "PaceLab",
  appleWebApp: { capable: true, title: "PaceLab", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full">{children}</body>
    </html>
  );
}
