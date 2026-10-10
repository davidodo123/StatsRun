"use client";

import { useActionState, useState } from "react";
import { deleteMeasurement, saveMeasurement } from "@/app/strength-actions";
import type { FormState } from "@/app/actions";
import type { BodyMeasurement } from "@/lib/types";
import { TrendLine } from "./charts";
import { Card } from "./ui";
import { keepForm } from "./keepForm";

type Field = Exclude<keyof BodyMeasurement, "date">;
const FIELDS: { id: Field; label: string; unit: string }[] = [
  { id: "weightKg", label: "Peso", unit: "kg" },
  { id: "fatPct", label: "% de grasa", unit: "%" },
  { id: "waistCm", label: "Cintura", unit: "cm" },
  { id: "hipCm", label: "Cadera", unit: "cm" },
  { id: "chestCm", label: "Pecho", unit: "cm" },
  { id: "armCm", label: "Brazo", unit: "cm" },
  { id: "thighCm", label: "Muslo", unit: "cm" },
];
const num = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 1 });
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const day = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(2, 4)}`;

/** Medidas corporales: apuntar, ver cómo cambian y el historial. */
export function Measurements({ list, today }: { list: BodyMeasurement[]; today: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveMeasurement, {});
  const used = FIELDS.filter((f) => list.some((m) => m[f.id] !== undefined));
  const [metric, setMetric] = useState<Field>(used[0]?.id ?? "weightKg");
  const m = used.find((f) => f.id === metric) ?? used[0];
  const last = list[list.length - 1];
  const points = m ? list.filter((x) => x[m.id] !== undefined) : [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Apuntar medidas" subtitle="Rellena solo las que tengas. Mejor por la mañana, en ayunas y siempre igual.">
        {/* tras guardar cambian los datos y el formulario se monta de nuevo, vacío */}
        <form key={list.map((x) => Object.values(x).join()).join("|")} onSubmit={keepForm(action)} className="space-y-3">
          <label className="field">
            Fecha
            <input className="input" type="date" name="date" defaultValue={today} max={today} required />
          </label>
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <label key={f.id} className="field">
                {f.label} ({f.unit})
                <input className="input" name={f.id} inputMode="decimal" placeholder={last?.[f.id] !== undefined ? num(last[f.id]!) : "–"} />
              </label>
            ))}
          </div>
          {state.error && <p className="text-sm font-medium text-critical">{state.error}</p>}
          {state.ok && <p className="text-sm font-medium text-good-ink">{state.message}</p>}
          <button className="btn w-full" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </button>
          <p className="text-xs text-muted">El peso más reciente se copia a tu perfil: se usa para los ejercicios con peso corporal y para el plan.</p>
        </form>
      </Card>

      <div className="space-y-4">
        <Card title="Evolución">
          {m && points.length >= 2 ? (
            <TrendLine data={points as unknown as Record<string, unknown>[]} dataKey={m.id} name={`${m.label} (${m.unit})`} xKey="date" format="dec1" height={180} />
          ) : (
            <p className="grid h-32 place-items-center text-center text-sm text-muted">Con dos días apuntados verás aquí cómo cambian.</p>
          )}
          {used.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {used.map((f) => (
                <button key={f.id} type="button" onClick={() => setMetric(f.id)} className={`rounded-full px-3 py-1.5 text-sm font-medium ${m?.id === f.id ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </Card>

        {list.length > 0 && (
          <Card title="Historial">
            <ul className="divide-y divide-line">
              {[...list].reverse().map((x) => (
                <li key={x.date} className="flex items-start justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <strong className="block text-sm">{day(x.date)}</strong>
                    <span className="text-xs text-ink-2">
                      {FIELDS.filter((f) => x[f.id] !== undefined)
                        .map((f) => `${f.label} ${num(x[f.id]!)} ${f.unit}`)
                        .join(" · ")}
                    </span>
                  </span>
                  <form action={deleteMeasurement}>
                    <input type="hidden" name="date" value={x.date} />
                    <button className="px-1 text-muted hover:text-critical" aria-label={`Borrar las medidas del ${day(x.date)}`}>
                      ✕
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
