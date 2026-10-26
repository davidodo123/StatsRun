"use client";

import Link from "next/link";
import { useState } from "react";
import { translator, weekdayDate, weekdayInitials, intlLocale, type Locale } from "@/lib/i18n";

export interface WeekBarDay {
  date: string;
  km: number;
  any: boolean; // tiene alguna sesión
  done: boolean;
  sessions: { id: string; title: string; km: number; min: number; strength: boolean; status?: "done" | "partial" | "missed" | "today" | "upcoming"; routine: boolean }[];
}

const STATUS_CLS = { done: "text-good-ink", partial: "text-warning", missed: "text-critical", today: "text-accent", upcoming: "text-muted" } as const;

/** Las barras de la semana de Inicio: al tocar un día se ven sus entrenos debajo (por defecto, hoy). */
export function WeekBars({ days, today, locale }: { days: WeekBarDay[]; today: string; locale: Locale }) {
  const t = translator(locale);
  const initials = weekdayInitials(locale);
  const [sel, setSel] = useState(days.some((d) => d.date === today) ? today : days[0]?.date);
  const maxKm = Math.max(1, ...days.map((d) => d.km));
  const day = days.find((d) => d.date === sel);
  const statusLabel = { done: t("sesion.hecho"), partial: t("sesion.parcial"), missed: t("sesion.noRealizado"), today: t("sesion.hoy"), upcoming: "" } as const;
  return (
    <>
      <div className="mt-3 flex h-16 items-end gap-1.5" role="tablist" aria-label={t("hoy.semana")}>
        {days.map((d) => (
          <button
            key={d.date}
            type="button"
            role="tab"
            aria-selected={d.date === sel}
            aria-label={weekdayDate(d.date, locale)}
            onClick={() => setSel(d.date)}
            className="flex h-full flex-1 items-end"
          >
            <span
              className={`block w-full rounded-sm transition ${d.date === today ? "bg-accent" : d.done ? "bg-ink" : "bg-surface-2"} ${d.date === sel ? "ring-2 ring-ink/60 ring-offset-2 ring-offset-bg" : ""}`}
              style={{ height: `${d.km > 0 ? Math.max(14, (d.km / maxKm) * 100) : d.any ? 10 : 4}%` }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5 text-center text-xs text-muted">
        {days.map((d, i) => (
          <button key={d.date} type="button" onClick={() => setSel(d.date)} className={d.date === today ? "font-bold text-accent" : d.date === sel ? "font-bold text-ink" : ""}>
            {initials[i]}
          </button>
        ))}
      </div>
      {day && (
        <div className="mt-3 rounded-xl border border-line bg-surface p-3 text-sm" role="tabpanel">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">{weekdayDate(day.date, locale)}</p>
          {day.sessions.length ? (
            <ul className="mt-2 space-y-2">
              {day.sessions.map((s) => (
                <li key={s.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0">
                    <strong className="block truncate">{s.title}</strong>
                    <span className="text-xs text-ink-2 tabular">
                      {s.km > 0 && `${s.km.toLocaleString(intlLocale(locale))} km · `}~{s.min} min
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-xs">
                    {s.status && statusLabel[s.status] && <span className={STATUS_CLS[s.status]}>{statusLabel[s.status]}</span>}
                    {s.strength && s.status !== "done" && s.status !== "missed" && (
                      <Link href={`/fuerza/entreno?sesion=${encodeURIComponent(s.id)}`} className="font-semibold text-accent">
                        {t(s.routine ? "sesion.empezarRutina" : "sesion.empezarEntreno")}
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-ink-2">{t("hoy.descanso")}</p>
          )}
          <Link href="/plan/actual" className="mt-2 block text-xs font-semibold text-accent">
            {t("hoy.verEnPlan")} →
          </Link>
        </div>
      )}
    </>
  );
}
