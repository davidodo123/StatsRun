"use client";

import { useState } from "react";
import { SimpleBars } from "./charts";
import type { RoutinePoint } from "@/lib/strength/workouts";
import { translator, type Locale } from "@/lib/i18n";

const METRICS = [
  { id: "volume", label: "wl.volumen", unit: " kg" },
  { id: "reps", label: "rc.reps", unit: "" },
  { id: "minutes", label: "wl.duracion", unit: " min" },
] as const;
const RANGES = [
  { months: 1, label: "rc.mes" },
  { months: 3, label: "rc.meses3" },
  { months: 12, label: "rc.ano" },
] as const;

/** Evolución de una rutina: volumen, repeticiones o duración de cada vez que se hizo. */
export function RoutineChart({ points, today, locale }: { points: RoutinePoint[]; today: string; locale: Locale }) {
  const t = translator(locale);
  const [metric, setMetric] = useState<(typeof METRICS)[number]["id"]>("volume");
  const [months, setMonths] = useState(3);
  const since = new Date(`${today}T12:00:00`);
  since.setMonth(since.getMonth() - months);
  const data = points.filter((p) => p.date >= since.toISOString().slice(0, 10));
  const m = METRICS.find((x) => x.id === metric)!;

  return (
    <div>
      <div className="flex justify-end">
        <select className="select-chip text-sm font-medium text-accent" value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label={t("rc.periodo")}>
          {RANGES.map((r) => (
            <option key={r.months} value={r.months}>
              {t(r.label)}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2 rounded-2xl border border-line bg-surface p-3">
        {data.length ? (
          <SimpleBars data={data as unknown as Record<string, unknown>[]} xKey="date" yKey={metric} name={t(m.label)} unit={m.unit} xFormat="day" height={180} locale={locale} />
        ) : (
          <div className="grid h-40 place-items-center text-center text-sm text-muted">
            <span>
              <svg viewBox="0 0 24 24" className="mx-auto mb-2 h-8 w-8 text-muted" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
                <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
              </svg>
              {t("rc.sinDatos")}
            </span>
          </div>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        {METRICS.map((x) => (
          <button key={x.id} type="button" onClick={() => setMetric(x.id)} className={`rounded-full px-4 py-1.5 text-sm font-medium ${metric === x.id ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink"}`}>
            {t(x.label)}
          </button>
        ))}
      </div>
    </div>
  );
}
