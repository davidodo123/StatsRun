"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/auth-actions";

const ITEMS = [
  { href: "/", label: "Inicio", icon: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { href: "/plan", label: "Plan", icon: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" },
  { href: "/registrar", label: "Registrar", icon: "M12 5v14M5 12h14" },
  { href: "/estadisticas", label: "Stats", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  { href: "/amigos", label: "Amigos", icon: "M9 11a4 4 0 100-8 4 4 0 000 8zm-7 10a7 7 0 0114 0M16 3.1a4 4 0 010 7.8M22 21a7 7 0 00-4-6.3" },
  { href: "/carreras", label: "Carreras", icon: "M5 21V4m0 0h11l-2 4 2 4H5" },
  { href: "/herramientas", label: "Calcular", icon: "M5 3h14v18H5zM8 7h8M8 11h2m3 0h3M8 15h2m3 0h3M8 18h2m3 0h3" },
  { href: "/perfil", label: "Perfil", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0" },
  { href: "/ajustes", label: "Datos", icon: "M12 15V3m0 0L8 7m4-4l4 4M4 15v4a1 1 0 001 1h14a1 1 0 001-1v-4" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function Nav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  if (path === "/login" || path === "/registro") return null;
  return (
    <>
      {/* Escritorio: barra lateral */}
      <nav className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-1 border-r border-line bg-surface p-4 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-2 text-lg font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-ink">▲</span>
          Pace<span className="text-accent">Lab</span>
        </Link>
        {ITEMS.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active(it.href) ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2"
            }`}
          >
            <Icon d={it.icon} />
            {it.label === "Stats" ? "Estadísticas" : it.label === "Calcular" ? "Calculadoras" : it.label === "Datos" ? "Importar / demo" : it.label}
          </Link>
        ))}
        <form action={logout} className="mt-auto">
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-2 hover:bg-surface-2">Cerrar sesión</button>
        </form>
      </nav>
      {/* Móvil: barra inferior */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {ITEMS.filter((i) => i.href !== "/herramientas" && i.href !== "/ajustes" && i.href !== "/carreras").map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${active(it.href) ? "text-accent" : "text-muted"}`}
          >
            <Icon d={it.icon} />
            {it.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
