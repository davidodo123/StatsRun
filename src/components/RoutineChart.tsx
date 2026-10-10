"use client";

import { useState } from "react";
import { SimpleBars } from "./charts";
import type { RoutinePoint } from "@/lib/strength/workouts";

const METRICS = [
  { id: "volume", label: "Volumen", unit: " kg" },
  { id: "reps", label: "Repeticiones", unit: "" },
  { id: "minutes", label: "Duración", unit: " min" },
] as const;
const RANGES = [
  { months: 1, label: "Último mes" },
  { months: 3, label: "Últimos 3 meses" },
  { months: 12, label: "Último año" },
];

/** Evolución de una rutina: volumen, repeticiones o duración de cada vez que se hizo. */
export function RoutineChart({ points, today }: { points: RoutinePoint[]; today: string }) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]["id"]>("volume");
  const [months, setMonths] = useState(3);
  const since = new Date(`${today}T12:00:00`);
  since.setMonth(since.getMonth() - months);
  const data = points.filter((p) => p.date >= since.toISOString().slice(0, 10));
  const m = METRICS.find((x) => x.id === metric)!;

  return (
    <div>
      <div className="flex justify-end">
        <select className="select-chip text-sm font-medium text-accent" value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="Periodo">
          {RANGES.map((r) => (
            <option key={r.months} value={r.months}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2 rounded-2xl border border-line bg-surface p-3">
        {data.length ? (
          <SimpleBars data={data as unknown as Record<string, unknown>[]} xKey="date" yKey={metric} name={m.label} unit={m.unit} xFormat="day" height={180} />
        ) : (
          <div className="grid h-40 place-items-center text-center text-sm text-muted">
            <span>
              <svg viewBox="0 0 24 24" className="mx-auto mb-2 h-8 w-8 text-muted" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
                <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
              </svg>
              No hay datos en este periodo
            </span>
          </div>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        {METRICS.map((x) => (
          <button key={x.id} type="button" onClick={() => setMetric(x.id)} className={`rounded-full px-4 py-1.5 text-sm font-medium ${metric === x.id ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink"}`}>
            {x.label}
          </button>
        ))}
      </div>
    </div>
  );
}
