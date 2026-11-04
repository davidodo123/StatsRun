"use client";

import { ChipLink, DoneChip } from "./ui";
import { Icon } from "./icons";
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

const STATUS_CLS = { partial: "text-warning", missed: "text-critical", today: "text-accent", upcoming: "text-muted" } as const;
const startable = (s: WeekBarDay["sessions"][number]) => s.strength && s.status !== "done" && s.status !== "missed";

/**
 * Las barras de la semana de Inicio: al tocar un día se ven sus entrenos debajo (por defecto, hoy).
 * Con `selected` y `onSelect`, el día lo lleva quien la usa (Inicio cambia también lo grande de arriba).
 */
export function WeekBars({ days, today, locale, selected, onSelect }: { days: WeekBarDay[]; today: string; locale: Locale; selected?: string; onSelect?: (date: string) => void }) {
  const t = translator(locale);
  const initials = weekdayInitials(locale);
  const [own, setOwn] = useState(days.some((d) => d.date === today) ? today : days[0]?.date);
  const sel = selected ?? own;
  const setSel = onSelect ?? setOwn;
  const maxKm = Math.max(1, ...days.map((d) => d.km));
  const day = days.find((d) => d.date === sel);
  const statusLabel = { done: t("sesion.hecho"), partial: t("sesion.parcial"), missed: t("sesion.noRealizado"), today: t("sesion.hoy"), upcoming: "" } as const;
  return (
    <>
      <div className="mt-3 flex h-20 items-end gap-1.5" role="tablist" aria-label={t("hoy.semana")}>
        {days.map((d) => {
          const strength = d.sessions.some((x) => x.strength);
          const run = d.km > 0 || d.sessions.some((x) => !x.strength);
          // más uniformes: con carrera, de un 40 % a todo según los km; solo fuerza, su barra (antes era igual que descanso);
          // descanso, una línea
          const height = run ? 40 + (d.km / maxKm) * 60 : strength ? 40 : 5;
          const on = d.date === sel;
          return (
            <button
              key={d.date}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={weekdayDate(d.date, locale)}
              onClick={() => setSel(d.date)}
              className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
            >
              {/* pesa: ese día hay fuerza (encima de la barra si también se corre; dentro si es solo fuerza) */}
              {strength && run && <Icon name="dumbbell" className={`h-3.5 w-3.5 shrink-0 ${on ? "text-accent" : "text-muted"}`} />}
              <span
                // solo el día elegido va en verde; al pasar por encima se ilumina
                className={`flex w-full items-center justify-center rounded-md transition ${on ? "bg-accent text-accent-ink" : `${d.done ? "bg-ink text-bg" : run || strength ? "bg-surface-2 text-muted" : "bg-surface-2/60"} group-hover:bg-accent/60`}`}
                style={{ height: `${height}%` }}
              >
                {strength && !run && <Icon name="dumbbell" className="h-4 w-4" />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5 text-center text-xs text-muted">
        {days.map((d, i) => (
          <button key={d.date} type="button" onClick={() => setSel(d.date)} className={d.date === sel ? "font-bold text-accent" : d.date === today ? "font-bold text-ink" : "hover:text-accent"}>
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
                  <span className="flex shrink-0 items-center gap-3 self-center text-xs">
                    {/* con botón de empezar, sin «Hoy» al lado: se juntaban y el día ya está arriba */}
                    {s.status === "done" ? <DoneChip>{statusLabel.done}</DoneChip> : s.status && statusLabel[s.status] && !startable(s) && <span className={STATUS_CLS[s.status]}>{statusLabel[s.status]}</span>}
                    {startable(s) && (
                      <Link href={`/fuerza/entreno?sesion=${encodeURIComponent(s.id)}`} className="btn px-3 py-1.5 text-xs">
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
          <ChipLink href="/plan/actual" className="mt-3">
            {t("hoy.verEnPlan")}
          </ChipLink>
        </div>
      )}
    </>
  );
}
