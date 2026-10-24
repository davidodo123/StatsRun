"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

// Páginas de la app por las que se ha pasado en esta pestaña (para saber si «Volver» puede ir atrás sin salir de la app).
const KEY = "rio-nav";

function readStack(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

/** Apunta cada cambio de página: si se vuelve a la anterior, se quita la última (ha sido un «atrás»). */
export function NavHistory() {
  const path = usePathname();
  useEffect(() => {
    const stack = readStack();
    if (stack.at(-1) === path) return;
    if (stack.at(-2) === path) stack.pop();
    else stack.push(path);
    try {
      sessionStorage.setItem(KEY, JSON.stringify(stack.slice(-50)));
    } catch {}
  }, [path]);
  return null;
}

/**
 * «← Volver»: a la página de la app de la que se viene (la rutina, el entreno, el perfil…).
 * Si se ha entrado directamente (enlace o app recién abierta), a `href`.
 */
export function BackLink({ href, className = "mb-4 inline-block py-1 text-sm text-ink-2 hover:text-ink", children = "← Volver" }: { href: string; className?: string; children?: ReactNode }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      className={className}
      onClick={(ev) => {
        if (readStack().length < 2) return;
        ev.preventDefault();
        router.back();
      }}
    >
      {children}
    </Link>
  );
}
