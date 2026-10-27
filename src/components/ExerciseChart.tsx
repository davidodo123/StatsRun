"use client";

import { useState } from "react";
import { SimpleBars, TrendLine } from "./charts";
import type { ExercisePoint } from "@/lib/strength/workouts";
import { translator, type Key, type Locale } from "@/lib/i18n";

type Metric = { id: "oneRm" | "topKg" | "volume" | "reps" | "maxReps"; label: Key; unit: string; line?: boolean };
const WEIGHTED: Metric[] = [
  { id: "oneRm", label: "ech.rm", unit: "kg", line: true },
  { id: "topKg", label: "ech.masPeso", unit: "kg", line: true },
  { id: "volume", label: "wl.volumen", unit: "kg" },
  { id: "reps", label: "rc.reps", unit: "" },
];
const BODY: Metric[] = [
  { id: "maxReps", label: "ech.mejorSerie", unit: "reps", line: true },
  { id: "reps", label: "rc.reps", unit: "" },
];
const RANGES: { months: number; label: Key }[] = [
  { months: 3, label: "rc.meses3" },
  { months: 12, label: "rc.ano" },
  { months: 0, label: "ech.todo" },
];

/** Evolución de un ejercicio: 1RM estimado, peso, volumen o repeticiones de cada sesión. */
export function ExerciseChart({ points, today, locale }: { points: ExercisePoint[]; today: string; locale: Locale }) {
  const t = translator(locale);
  const metrics = points.some((p) => p.topKg > 0) ? WEIGHTED : BODY;
  const [metric, setMetric] = useState(metrics[0].id);
  const [months, setMonths] = useState(0);
  const since = new Date(`${today}T12:00:00`);
  since.setMonth(since.getMonth() - months);
  const data = (months ? points.filter((p) => p.date >= since.toISOString().slice(0, 10)) : points) as unknown as Record<string, unknown>[];
  const m = metrics.find((x) => x.id === metric) ?? metrics[0];

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
      <div className="mt-2">
        {data.length < 2 ? (
          <p className="grid h-40 place-items-center text-center text-sm text-muted">{t("ech.dos")}</p>
        ) : m.line ? (
          <TrendLine data={data} dataKey={m.id} name={t(m.label)} xKey="date" format={m.id === "maxReps" ? "int" : "dec1"} height={180} locale={locale} />
        ) : (
          <SimpleBars data={data} xKey="date" yKey={m.id} name={t(m.label)} unit={m.unit} xFormat="day" height={180} locale={locale} />
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {metrics.map((x) => (
          <button key={x.id} type="button" onClick={() => setMetric(x.id)} className={`rounded-full px-3 py-1.5 text-sm font-medium ${m.id === x.id ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink"}`}>
            {t(x.label)}
          </button>
        ))}
      </div>
    </div>
  );
}
