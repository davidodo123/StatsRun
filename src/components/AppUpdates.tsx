"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { useClientLocale } from "./useClientLocale";
import { translator } from "@/lib/i18n";
import { NOVEDADES, novedadesDesde, type Novedad } from "@/lib/novedades";

const PULL = 80; // px que hay que tirar para actualizar
const CHECK_EVERY = 10 * 60_000;

/**
 * En el iPhone instalado no hay «tirar para actualizar» ni forma de coger una versión nueva sin cerrar la app:
 * - tirar hacia abajo estando arriba del todo recarga la página;
 * - al volver a la app (y cada 10 min) se mira si hay una versión publicada más nueva y, si la hay, sale la pantalla
 *   «Novedades» con lo que trae (lib/novedades.ts) y el botón de actualizar; con «Más tarde» queda un botón arriba.
 */
export function AppUpdates({ version }: { version: string }) {
  const [pull, setPull] = useState(0);
  const locale = useClientLocale();
  const t = translator(locale);
  const [update, setUpdate] = useState(false);
  const [news, setNews] = useState<Novedad[] | null>(null); // pantalla de novedades abierta
  const shown = useRef(false); // la pantalla sale una vez; después, el botón de arriba
  const start = useRef<{ x: number; y: number } | undefined>(undefined);
  const pulled = useRef(0); // lo mismo que «pull», para leerlo al soltar

  // ¿hay versión nueva?
  useEffect(() => {
    // «?novedades» en la dirección la abre sin esperar a una versión nueva (para verla)
    if (new URLSearchParams(window.location.search).has("novedades")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- la dirección solo se lee en el navegador
      setNews(NOVEDADES.slice(0, 1));
      shown.current = true;
    }
    if (version === "dev") return;
    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { version: live, novedades } = (await res.json()) as { version?: string; novedades?: Novedad[] };
        if (live && live !== "dev" && live !== version) {
          setUpdate(true);
          if (!shown.current) setNews(novedadesDesde(novedades ?? [], NOVEDADES[0]?.id ?? ""));
          shown.current = true;
        }
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
            {ready ? t("upd.suelta") : t("upd.tira")}
          </span>
        </div>
      )}
      {update && !news && (
        <div className="fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] z-50 flex justify-center px-4 md:top-4">
          <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink shadow-lg">
            <Icon name="sparkle" className="h-4 w-4" />
            {t("upd.hay")}
          </button>
        </div>
      )}
      {news && (
        <div className="fixed inset-0 z-[60] grid place-items-end bg-black/60 md:place-items-center" role="dialog" aria-modal aria-label={t("upd.titulo")}>
          <div className="flex max-h-[90dvh] w-full flex-col rounded-t-3xl border-t border-line bg-surface md:max-w-md md:rounded-3xl md:border">
            <div className="space-y-4 overflow-y-auto p-5 pb-3">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-accent-ink">
                  <Icon name="sparkle" className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="font-display text-2xl leading-tight">{t("upd.titulo")}</h2>
                  <p className="text-sm text-ink-2">{t("upd.sub")}</p>
                </div>
              </div>
              <ul className="space-y-2">
                {(news.length ? news.flatMap((n) => n.items) : [{ icon: "check" as const, txt: null }]).map((it, i) => {
                  const [title, text] = it.txt ? (it.txt[locale] ?? it.txt.es) : [t("upd.mejoras"), t("upd.mejorasTxt")];
                  return (
                    <li key={i} className="flex gap-3 rounded-2xl bg-surface-2 p-3.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line text-accent">
                        <Icon name={it.icon} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{title}</p>
                        <p className="text-sm text-ink-2">{text}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="flex gap-2 border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button type="button" className="btn btn-ghost flex-1" onClick={() => setNews(null)}>
                {t("upd.luego")}
              </button>
              <button type="button" className="btn flex-[2]" onClick={() => window.location.reload()}>
                {t("upd.actualizar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
