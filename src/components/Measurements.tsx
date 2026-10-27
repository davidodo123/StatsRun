"use client";

import { useActionState, useState } from "react";
import { deleteMeasurement, saveMeasurement } from "@/app/strength-actions";
import type { FormState } from "@/app/actions";
import type { BodyMeasurement } from "@/lib/types";
import { TrendLine } from "./charts";
import { Card } from "./ui";
import { keepForm } from "./keepForm";
import { intlLocale, translator, type Key, type Locale } from "@/lib/i18n";

type Field = Exclude<keyof BodyMeasurement, "date">;
const FIELDS: { id: Field; label: Key; unit: string }[] = [
  { id: "weightKg", label: "med.peso", unit: "kg" },
  { id: "fatPct", label: "med.grasa", unit: "%" },
  { id: "waistCm", label: "med.cintura", unit: "cm" },
  { id: "hipCm", label: "med.cadera", unit: "cm" },
  { id: "chestCm", label: "med.pecho", unit: "cm" },
  { id: "armCm", label: "med.brazo", unit: "cm" },
  { id: "thighCm", label: "med.muslo", unit: "cm" },
];

/** Medidas corporales: apuntar, ver cómo cambian y el historial. */
export function Measurements({ list, today, locale }: { list: BodyMeasurement[]; today: string; locale: Locale }) {
  const t = translator(locale);
  const num = (n: number) => n.toLocaleString(intlLocale(locale), { maximumFractionDigits: 1 });
  // «26 oct 26»
  const day = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString(intlLocale(locale), { day: "numeric", month: "short", year: "2-digit", timeZone: "UTC" });
  const [state, action, pending] = useActionState<FormState, FormData>(saveMeasurement, {});
  const used = FIELDS.filter((f) => list.some((m) => m[f.id] !== undefined));
  const [metric, setMetric] = useState<Field>(used[0]?.id ?? "weightKg");
  const m = used.find((f) => f.id === metric) ?? used[0];
  const last = list[list.length - 1];
  const points = m ? list.filter((x) => x[m.id] !== undefined) : [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title={t("med.apuntar")} subtitle={t("med.apuntarSub")}>
        {/* tras guardar cambian los datos y el formulario se monta de nuevo, vacío */}
        <form key={list.map((x) => Object.values(x).join()).join("|")} onSubmit={keepForm(action)} className="space-y-3">
          <label className="field">
            {t("med.fecha")}
            <input className="input" type="date" name="date" defaultValue={today} max={today} required />
          </label>
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <label key={f.id} className="field">
                {t(f.label)} ({f.unit})
                <input className="input" name={f.id} inputMode="decimal" placeholder={last?.[f.id] !== undefined ? num(last[f.id]!) : "–"} />
              </label>
            ))}
          </div>
          {state.error && <p className="text-sm font-medium text-critical">{state.error}</p>}
          {state.ok && <p className="text-sm font-medium text-good-ink">{state.message}</p>}
          <button className="btn w-full" disabled={pending}>
            {pending ? t("wl.guardando") : t("re.guardar")}
          </button>
          <p className="text-xs text-muted">{t("med.copia")}</p>
        </form>
      </Card>

      <div className="space-y-4">
        <Card title={t("ex.evolucion")}>
          {m && points.length >= 2 ? (
            <TrendLine data={points as unknown as Record<string, unknown>[]} dataKey={m.id} name={`${t(m.label)} (${m.unit})`} xKey="date" format="dec1" height={180} locale={locale} />
          ) : (
            <p className="grid h-32 place-items-center text-center text-sm text-muted">{t("med.dos")}</p>
          )}
          {used.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {used.map((f) => (
                <button key={f.id} type="button" onClick={() => setMetric(f.id)} className={`rounded-full px-3 py-1.5 text-sm font-medium ${m?.id === f.id ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink"}`}>
                  {t(f.label)}
                </button>
              ))}
            </div>
          )}
        </Card>

        {list.length > 0 && (
          <Card title={t("ex.historial")}>
            <ul className="divide-y divide-line">
              {[...list].reverse().map((x) => (
                <li key={x.date} className="flex items-start justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <strong className="block text-sm">{day(x.date)}</strong>
                    <span className="text-xs text-ink-2">
                      {FIELDS.filter((f) => x[f.id] !== undefined)
                        .map((f) => `${t(f.label)} ${num(x[f.id]!)} ${f.unit}`)
                        .join(" · ")}
                    </span>
                  </span>
                  <form action={deleteMeasurement}>
                    <input type="hidden" name="date" value={x.date} />
                    <button className="px-1 text-muted hover:text-critical" aria-label={t("med.borrarAria", { fecha: day(x.date) })}>
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
