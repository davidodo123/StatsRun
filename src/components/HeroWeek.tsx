"use client";

import { useState, type ReactNode } from "react";
import { WeekBars, type WeekBarDay } from "./WeekBars";
import type { Locale } from "@/lib/i18n";

/**
 * Inicio: lo grande de arriba es del día elegido en las barras de la semana (por defecto, hoy).
 * Cada día ya viene pintado del servidor (`heroes`); aquí solo se elige cuál se ve.
 * Todos van apilados en la misma celda (los demás, invisibles): el bloque mide siempre lo del día más alto y las barras
 * no se mueven al cambiar de día (antes la pantalla subía o bajaba según el texto de cada día).
 */
export function HeroWeek({
  heroes,
  days,
  today,
  locale,
  weekHeader,
  backLabel,
}: {
  heroes: Record<string, ReactNode>;
  days: WeekBarDay[];
  today: string;
  locale: Locale;
  weekHeader?: ReactNode;
  backLabel: string;
}) {
  const [sel, setSel] = useState(today);
  const current = heroes[sel] ? sel : today;
  return (
    <>
      {/* «Volver a hoy» siempre ocupa su sitio (invisible en hoy): si no, al salir de hoy todo bajaba una línea */}
      <button type="button" onClick={() => setSel(today)} className={`mb-3 text-sm font-semibold text-accent ${current === today ? "invisible" : ""}`} aria-hidden={current === today} tabIndex={current === today ? -1 : 0}>
        ← {backLabel}
      </button>
      <div className="grid">
        {Object.entries(heroes).map(([date, hero]) => (
          <div key={date} style={{ gridArea: "1 / 1" }} className={date === current ? "" : "invisible"} aria-hidden={date !== current}>
            {hero}
          </div>
        ))}
      </div>
      {days.length > 0 && (
        <div className="mt-7 border-t border-line pt-4">
          {weekHeader}
          <WeekBars days={days} today={today} locale={locale} selected={current} onSelect={setSel} />
        </div>
      )}
    </>
  );
}
