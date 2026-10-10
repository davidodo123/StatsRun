"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/auth-actions";

const ITEMS = [
  { href: "/", label: "Inicio", icon: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { href: "/plan", label: "Plan", icon: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" },
  { href: "/fuerza", label: "Fuerza", icon: "M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" },
  { href: "/registrar", label: "Registrar", icon: "M12 5v14M5 12h14" },
  { href: "/estadisticas", label: "Stats", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  { href: "/amigos", label: "Amigos", icon: "M9 11a4 4 0 100-8 4 4 0 000 8zm-7 10a7 7 0 0114 0M16 3.1a4 4 0 010 7.8M22 21a7 7 0 00-4-6.3" },
  { href: "/carreras", label: "Carreras", icon: "M5 21V4m0 0h11l-2 4 2 4H5" },
  { href: "/herramientas", label: "Calcular", icon: "M5 3h14v18H5zM8 7h8M8 11h2m3 0h3M8 15h2m3 0h3M8 18h2m3 0h3" },
  { href: "/perfil", label: "Perfil", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0" },
  { href: "/ajustes", label: "Datos", icon: "M12 15V3m0 0L8 7m4-4l4 4M4 15v4a1 1 0 001 1h14a1 1 0 001-1v-4" },
];

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

// en el móvil caben 5 secciones con holgura; el resto va en «Más»
const MOBILE_MAIN = ["/", "/plan", "/fuerza", "/registrar", "/perfil"];
const MORE_ICON = "M5 12h.01M12 12h.01M19 12h.01";
const LONG_LABEL: Record<string, string> = { "/estadisticas": "Estadísticas", "/herramientas": "Calculadoras", "/ajustes": "Importar / demo" };

/** Móvil: barra inferior con las 5 secciones principales y un panel «Más» con el resto. */
function MobileNav({ active }: { active: (href: string) => boolean }) {
  const [more, setMore] = useState(false);
  const main = ITEMS.filter((i) => MOBILE_MAIN.includes(i.href));
  const rest = ITEMS.filter((i) => !MOBILE_MAIN.includes(i.href));
  const restActive = rest.some((i) => active(i.href));
  const tab = "flex flex-1 flex-col items-center justify-center gap-1 pb-1.5 pt-2.5 text-[11px] font-medium";
  return (
    <>
      {more && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] rounded-2xl border border-line bg-surface p-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-3 gap-1">
              {rest.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setMore(false)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl px-1 py-3 text-xs font-medium ${active(it.href) ? "bg-surface-2 text-accent" : "text-ink-2 hover:bg-surface-2"}`}
                >
                  <Icon d={it.icon} className="h-6 w-6" />
                  {LONG_LABEL[it.href] ?? it.label}
                </Link>
              ))}
            </div>
            <form action={logout} className="mt-1 border-t border-line pt-1">
              <button className="w-full rounded-xl py-2.5 text-sm font-medium text-ink-2 hover:bg-surface-2">Cerrar sesión</button>
            </form>
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {main.map((it) => (
          <Link key={it.href} href={it.href} className={`${tab} ${active(it.href) ? "text-accent" : "text-muted"}`}>
            <Icon d={it.icon} className="h-6 w-6" />
            {it.label}
          </Link>
        ))}
        <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className={`${tab} ${more || restActive ? "text-accent" : "text-muted"}`}>
          <Icon d={MORE_ICON} className="h-6 w-6" />
          Más
        </button>
      </nav>
    </>
  );
}

/** Menú con la sección actual resaltada. Va dentro de <Suspense fallback={<NavView />}>: la ruta solo se conoce al pedir la página. */
export function Nav() {
  const path = usePathname();
  const query = useSearchParams().toString();
  // páginas visitadas en esta pestaña: para volver al sitio de antes tras borrar algo
  useEffect(() => {
    const url = query ? `${path}?${query}` : path;
    try {
      const list = JSON.parse(sessionStorage.getItem(VISITED) ?? "[]") as string[];
      if (list.at(-1) !== url) sessionStorage.setItem(VISITED, JSON.stringify([...list, url].slice(-30)));
    } catch {}
  }, [path, query]);
  return <NavView path={path} />;
}

const VISITED = "rio-visitadas";

/** Última página visitada que no cumpla `skip` (p. ej. las del entreno que se acaba de borrar). */
export function lastVisited(skip: (url: string) => boolean, fallback: string): string {
  try {
    const list = JSON.parse(sessionStorage.getItem(VISITED) ?? "[]") as string[];
    return [...list].reverse().find((u) => !skip(u)) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Menú sin sección resaltada (el que se prerenderiza) o con ella. */
export function NavView({ path }: { path?: string }) {
  const active = (href: string) => path !== undefined && (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      {/* Escritorio: barra lateral */}
      <nav className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-1 border-r border-line bg-surface p-4 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-2 text-lg font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-ink">▲</span>
          {/* un solo bloque: el contenedor flex separaría «Run-In-» de «Out» */}
          <span>
            Run-In-<span className="text-accent">Out</span>
          </span>
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
      <MobileNav active={active} />
    </>
  );
}
