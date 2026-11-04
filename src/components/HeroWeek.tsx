"use client";

import { useRef, useState, type ReactNode } from "react";
import { WeekBars, type WeekBarDay } from "./WeekBars";
import type { Locale } from "@/lib/i18n";

/**
 * Inicio: lo grande de arriba es del día elegido en las barras de la semana (por defecto, hoy).
 * Cada día ya viene pintado del servidor (`heroes`); aquí solo se elige cuál se ve.
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
  const [sel, setSelState] = useState(today);
  const top = useRef<HTMLDivElement>(null);
  const shown = heroes[sel] ?? heroes[today];
  // si lo de arriba no se ve (pantalla bajada), se sube hasta ahí para ver el día elegido
  const setSel = (date: string) => {
    setSelState(date);
    const el = top.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <>
      <div ref={top} className="scroll-mt-20" />
      {sel !== today && heroes[today] && (
        <button type="button" onClick={() => setSel(today)} className="mb-3 text-sm font-semibold text-accent">
          ← {backLabel}
        </button>
      )}
      {/* al cambiar de día, el bloque entra suave (sin saltos de altura bruscos) */}
      <div key={sel} className="animate-[fadein_.18s_ease-out]">
        {shown}
      </div>
      {days.length > 0 && (
        <div className="mt-7 border-t border-line pt-4">
          {weekHeader}
          <WeekBars days={days} today={today} locale={locale} selected={sel} onSelect={setSel} />
        </div>
      )}
    </>
  );
}
