"use client";

import { useState, type ReactNode } from "react";
import { WeekBars, type WeekBarDay } from "./WeekBars";
import type { Locale } from "@/lib/i18n";

/**
 * Inicio: lo grande de arriba es del día elegido en las barras de la semana (por defecto, hoy).
 * Cada día ya viene pintado del servidor (`heroes`); aquí solo se elige cuál se ve.
 * Todos van apilados en la misma celda (los demás, invisibles): el bloque mide siempre lo del día más alto y las barras
 * no se mueven al cambiar de día (antes la pantalla subía o bajaba según el texto de cada día).
 * «Volver a hoy» sustituye a la palabra «Semana» en su fila: así no ocupa sitio arriba ni mueve nada.
 */
export function HeroWeek({
  heroes,
  days,
  today,
  locale,
  weekLabel,
  weekTotal,
  backLabel,
}: {
  heroes: Record<string, ReactNode>;
  days: WeekBarDay[];
  today: string;
  locale: Locale;
  weekLabel: string;
  weekTotal?: ReactNode;
  backLabel: string;
}) {
  const [sel, setSel] = useState(today);
  const current = heroes[sel] ? sel : today;
  return (
    <>
      <div className="grid">
        {Object.entries(heroes).map(([date, hero]) => (
          <div key={date} style={{ gridArea: "1 / 1" }} className={`flex flex-col ${date === current ? "" : "invisible"}`} aria-hidden={date !== current}>
            {hero}
          </div>
        ))}
      </div>
      {days.length > 0 && (
        <div className="mt-7 border-t border-line pt-4">
          <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-muted uppercase">
            {current === today ? (
              <span>{weekLabel}</span>
            ) : (
              <button type="button" onClick={() => setSel(today)} className="-my-2 py-2 font-semibold tracking-wider text-accent uppercase">
                ← {backLabel}
              </button>
            )}
            <span>{weekTotal}</span>
          </div>
          <WeekBars days={days} today={today} locale={locale} selected={current} onSelect={setSel} />
        </div>
      )}
    </>
  );
}
