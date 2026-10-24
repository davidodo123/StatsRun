"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { logout } from "@/app/auth-actions";
import type { Focus } from "@/lib/types";
import { LogoMark } from "./LogoMark";

const ITEMS = [
  { href: "/", label: "Inicio", icon: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { href: "/plan", label: "Plan", icon: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" },
  { href: "/fuerza", label: "Fuerza", icon: "M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" },
  { href: "/registrar", label: "Registrar", icon: "M12 5v14M5 12h14" },
  { href: "/entrenador", label: "Entrenador IA", icon: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" },
  { href: "/estadisticas", label: "Stats", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  { href: "/amigos", label: "Amigos", icon: "M9 11a4 4 0 100-8 4 4 0 000 8zm-7 10a7 7 0 0114 0M16 3.1a4 4 0 010 7.8M22 21a7 7 0 00-4-6.3" },
  { href: "/carreras", label: "Carreras", icon: "M5 21V4m0 0h11l-2 4 2 4H5" },
  { href: "/herramientas", label: "Calcular", icon: "M5 3h14v18H5zM8 7h8M8 11h2m3 0h3M8 15h2m3 0h3M8 18h2m3 0h3" },
  { href: "/sueno", label: "Sueño", icon: "M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" },
  { href: "/perfil", label: "Perfil", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0" },
  { href: "/ajustes", label: "Datos", icon: "M12 15V3m0 0L8 7m4-4l4 4M4 15v4a1 1 0 001 1h14a1 1 0 001-1v-4" },
];
// solo fuerza: sin lo de correr (plan, carreras, estadísticas), con el entrenador y «Entrenar» en vez de «Registrar»
const STRENGTH_ITEMS = [
  ITEMS[0],
  ITEMS[2],
  { href: "/entrenador", label: "Entrenador", icon: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" },
  { href: "/fuerza/entreno", label: "Entrenar", icon: "M12 5v14M5 12h14" },
  { href: "/fuerza/ejercicios", label: "Ejercicios", icon: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" },
  ...ITEMS.filter((i) => ["/amigos", "/perfil", "/herramientas", "/sueno", "/registrar", "/ajustes"].includes(i.href)),
];
const itemsFor = (focus?: Focus) => (focus === "fuerza" ? STRENGTH_ITEMS : ITEMS);

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

// móvil: arriba el logo, el Entrenador IA y Amigos; abajo 5 pestañas con Registrar destacado en el centro.
// Lo demás (estadísticas, carreras, sueño…) va dentro de «Tú» (el perfil)
const MOBILE_BOTTOM = ["/", "/plan", "/registrar", "/fuerza", "/perfil"];
const STRENGTH_BOTTOM = ["/", "/fuerza", "/fuerza/entreno", "/fuerza/ejercicios", "/perfil"];
const CTA = ["/registrar", "/fuerza/entreno"]; // el botón lima de la barra de abajo
const IN_TU = ["/perfil", "/estadisticas", "/carreras", "/sueno", "/herramientas", "/ajustes", "/registrar"];
const LONG_LABEL: Record<string, string> = { "/estadisticas": "Estadísticas", "/herramientas": "Calculadoras", "/ajustes": "Importar / demo", "/registrar": "Registrar actividad" };
const icon = (href: string) => ITEMS.find((i) => i.href === href)!.icon;

function Logo({ compact }: { compact?: boolean }) {
  return (
    <>
      <LogoMark className={compact ? "h-7 w-7" : "h-8 w-8"} />
      {/* un solo bloque: el contenedor flex separaría «Run-In-» de «Out» */}
      <span>
        Run-In-<span className="text-accent">Out</span>
      </span>
    </>
  );
}

/** Lo que en el móvil no cabe en la barra: va en «Tú», debajo de la cabecera del perfil. */
export function TuLinks({ focus }: { focus?: Focus }) {
  const bottomHrefs = focus === "fuerza" ? STRENGTH_BOTTOM : MOBILE_BOTTOM;
  const rest = itemsFor(focus).filter((i) => IN_TU.includes(i.href) && !bottomHrefs.includes(i.href) && i.href !== "/perfil");
  return (
    <nav aria-label="Más secciones" className="grid grid-cols-3 gap-2 md:hidden">
      {rest.map((it) => (
        <Link key={it.href} href={it.href} className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface px-1 py-3 text-xs font-medium text-ink-2">
          <Icon d={it.icon} className="h-6 w-6 text-accent" />
          {LONG_LABEL[it.href] ?? it.label}
        </Link>
      ))}
      <form action={logout} className="contents">
        <button className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-1 py-3 text-xs font-medium text-ink-2">
          <Icon d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" className="h-6 w-6" />
          Cerrar sesión
        </button>
      </form>
    </nav>
  );
}

/** Móvil: barra superior (logo = Inicio, Entrenador IA, Amigos) e inferior (Inicio, Plan, Registrar, Fuerza, Tú; o la de fuerza). */
function MobileNav({ active, focus }: { active: (href: string) => boolean; focus?: Focus }) {
  const items = itemsFor(focus);
  const bottomHrefs = focus === "fuerza" ? STRENGTH_BOTTOM : MOBILE_BOTTOM;
  const bottom = bottomHrefs.map((h) => items.find((i) => i.href === h)!);
  // «Tú» se queda encendido en las secciones que cuelgan de él
  const on = (href: string) => active(href) || (href === "/perfil" && IN_TU.some((h) => !bottomHrefs.includes(h) && active(h)));
  const tab = "flex flex-1 flex-col items-center justify-center gap-1 pb-1.5 pt-2.5 text-[11px] font-medium";
  return (
    <>
      <header className="vv-top fixed inset-x-0 top-0 z-40 border-b border-line bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight" aria-label="Inicio">
            <Logo compact />
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/entrenador"
              aria-label="Entrenador IA"
              className={`grid h-10 w-10 place-items-center rounded-full ${active("/entrenador") ? "bg-surface-2 text-accent" : "text-ink-2 hover:bg-surface-2"}`}
            >
              <Icon d={icon("/entrenador")} className="h-6 w-6" />
            </Link>
            <Link
              href="/amigos"
              aria-label="Amigos"
              className={`grid h-10 w-10 place-items-center rounded-full ${active("/amigos") ? "bg-surface-2 text-accent" : "text-ink-2 hover:bg-surface-2"}`}
            >
              <Icon d={icon("/amigos")} className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </header>

      {/* el color de la barra sigue por debajo: en el iPhone instalado, al llegar al final de una página larga
          o al rebotar, quedaba una franja negra bajo la barra */}
      <nav className="mobile-tabbar fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-line bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur after:absolute after:inset-x-0 after:top-full after:h-40 after:bg-surface md:hidden">
        {bottom.map((it) =>
          CTA.includes(it.href) ? (
            <div key={it.href} className="flex flex-1 justify-center">
              {/* solo un círculo con «+»: ocupa lo mismo que una pestaña */}
              <Link
                href={it.href}
                aria-label={LONG_LABEL[it.href] ?? it.label}
                className={`grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-ink shadow-md ${active(it.href) ? "ring-2 ring-accent/40 ring-offset-2 ring-offset-surface" : ""}`}
              >
                <Icon d={it.icon} className="h-6 w-6" />
              </Link>
            </div>
          ) : (
            // prefetch: las secciones principales llegan precargadas con tus datos (y la pestaña elegida)
            <Link key={it.href} href={it.href} prefetch={true} className={`${tab} ${on(it.href) ? "text-accent" : "text-muted"}`}>
              <Icon d={it.icon} className="h-6 w-6" />
              {it.href === "/perfil" ? "Tú" : it.label}
            </Link>
          ),
        )}
      </nav>
    </>
  );
}

/** Menú con la sección actual resaltada. Va dentro de <Suspense fallback={<NavView />}>: la ruta solo se conoce al pedir la página. */
export function Nav({ focus }: { focus?: Focus }) {
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
  return <NavView path={path} focus={focus} />;
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
export function NavView({ path, focus }: { path?: string; focus?: Focus }) {
  const items = itemsFor(focus);
  // resalta la entrada más concreta: en /fuerza/entreno, «Entrenar» y no «Fuerza»
  const matches = (href: string) => path !== undefined && (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`) || path.startsWith(`${href}?`));
  const active = (href: string) => matches(href) && !items.some((o) => o.href.length > href.length && o.href.startsWith(href) && matches(o.href));
  return (
    <>
      {/* Escritorio: barra lateral */}
      <nav className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-1 border-r border-line bg-surface p-4 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-2 text-lg font-bold tracking-tight">
          <Logo />
        </Link>
        {items.map((it) => (
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
      <MobileNav active={active} focus={focus} />
    </>
  );
}
