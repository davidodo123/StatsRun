"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

const PULL = 80; // px que hay que tirar para actualizar
const CHECK_EVERY = 10 * 60_000;

/**
 * En el iPhone instalado no hay «tirar para actualizar» ni forma de coger una versión nueva sin cerrar la app:
 * - tirar hacia abajo estando arriba del todo recarga la página;
 * - al volver a la app (y cada 10 min) se mira si hay una versión publicada más nueva y, si la hay, sale un botón.
 */
export function AppUpdates({ version }: { version: string }) {
  const [pull, setPull] = useState(0);
  const [update, setUpdate] = useState(false);
  const start = useRef<{ x: number; y: number } | undefined>(undefined);
  const pulled = useRef(0); // lo mismo que «pull», para leerlo al soltar

  // ¿hay versión nueva?
  useEffect(() => {
    if (version === "dev") return;
    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { version: live } = (await res.json()) as { version?: string };
        if (live && live !== "dev" && live !== version) setUpdate(true);
      } catch {}
    };
    const onVisible = () => document.visibilityState === "visible" && check();
    check();
    const t = setInterval(check, CHECK_EVERY);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [version]);

  // tirar hacia abajo para actualizar
  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      const target = e.target as Element | null;
      // no dentro de ventanas, listas que se deslizan o campos de texto
      if (window.scrollY > 0 || target?.closest("[role=dialog],input,textarea,select,.overflow-y-auto")) return;
      start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onMove = (e: TouchEvent) => {
      if (!start.current) return;
      const dy = e.touches[0].clientY - start.current.y;
      const dx = Math.abs(e.touches[0].clientX - start.current.x);
      if (dy <= 0 || dx > dy || window.scrollY > 0) {
        start.current = undefined;
        pulled.current = 0;
        setPull(0);
        return;
      }
      pulled.current = Math.min(dy * 0.6, PULL * 1.4);
      setPull(pulled.current);
    };
    const onEnd = () => {
      if (start.current && pulled.current >= PULL) window.location.reload();
      start.current = undefined;
      pulled.current = 0;
      setPull(0);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, []);
  const ready = pull >= PULL;
  return (
    <>
      {pull > 8 && (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(3.75rem+env(safe-area-inset-top))] z-50 flex justify-center md:top-3" style={{ transform: `translateY(${pull - 40}px)` }}>
          <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-lg ${ready ? "bg-accent text-accent-ink" : "border border-line bg-surface text-ink-2"}`}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ transform: `rotate(${(pull / PULL) * 270}deg)` }} aria-hidden>
              <path d="M20 12a8 8 0 11-2.3-5.7M20 4v5h-5" />
            </svg>
            {ready ? "Suelta para actualizar" : "Tira para actualizar"}
          </span>
        </div>
      )}
      {update && (
        <div className="fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] z-50 flex justify-center px-4 md:top-4">
          <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink shadow-lg">
            <Icon name="sparkle" className="h-4 w-4" />
            Hay una versión nueva · Actualizar
          </button>
        </div>
      )}
    </>
  );
}
