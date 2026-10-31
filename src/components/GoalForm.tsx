"use client";

import { useActionState } from "react";
import { saveGoal, type FormState } from "@/app/actions";
import type { Race } from "@/lib/races";
import { keepForm } from "./keepForm";
import { DEFAULT_LOCALE, intlLocale, translator, type Key, type Locale } from "@/lib/i18n";

/** Datos ya conocidos de una carrera de fuera del catálogo (p. ej. de Cruzando la Meta). */
export interface GoalPreset {
  raceId: string;
  name: string;
  distances: number[];
  date: string;
}

// las distancias con nombre: tal cual (5K…) o con su texto en cada idioma
const DISTANCES: { km: number; label: string; key?: Key }[] = [
  { km: 5, label: "5K" },
  { km: 10, label: "10K" },
  { km: 15, label: "15K" },
  { km: 21.0975, label: "", key: "gf.media" },
  { km: 42.195, label: "", key: "gf.maraton" },
];

export function GoalForm({ race, preset, defaultDate, hasProfile, locale = DEFAULT_LOCALE }: { race?: Race; preset?: GoalPreset; defaultDate: string; hasProfile: boolean; locale?: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(saveGoal, {});
  const kmLabel = (km: number) => {
    const d = DISTANCES.find((x) => Math.abs(x.km - km) < 0.05);
    return d ? (d.key ? t(d.key) : d.label) : `${km.toLocaleString(intlLocale(locale), { maximumFractionDigits: 2 })} km`;
  };
  // con una carrera conocida, sus distancias (la más larga primero); si no, las habituales
  const options = preset?.distances.length ? [...preset.distances].sort((a, b) => b - a) : DISTANCES.map((d) => d.km);
  return (
    <form onSubmit={keepForm(action)} className="space-y-4">
      {race && <input type="hidden" name="raceId" value={race.id} />}
      {preset && (
        <>
          <input type="hidden" name="raceId" value={preset.raceId} />
          <input type="hidden" name="name" value={preset.name} />
        </>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {!race && (
          <>
            {!preset && (
              <label className="field sm:col-span-2">
                {t("gf.nombre")}
                <input className="input" name="name" placeholder={t("gf.nombrePh")} required />
              </label>
            )}
            <label className="field">
              {t("gf.distancia")}
              <select className="input" name="distanceKm" defaultValue={String(preset ? options[0] : 21.0975)}>
                {options.map((km) => (
                  <option key={km} value={km}>
                    {kmLabel(km)}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <label className="field">
          {t("gf.fecha")}
          <input className="input" type="date" name="date" defaultValue={defaultDate} required />
        </label>
        <label className="field">
          {t("gf.tiempo")}
          <input className="input" name="targetTime" placeholder={t("gf.tiempoPh")} />
        </label>
        <label className="field">
          {t("gf.desnivel")}
          <input className="input" type="number" name="elevationGainM" defaultValue={race?.elevationGainM ?? 0} />
        </label>
        <label className="field">
          {t("gf.temp")}
          <input className="input" type="number" name="temperatureC" defaultValue={race?.temperatureC ?? 12} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn shrink-0" disabled={pending}>
          {pending ? t("gf.generando") : hasProfile ? t("gf.generar") : t("gf.guardar")}
        </button>
        {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
        {state.message && <p className="text-sm font-medium text-good-ink">✓ {state.message}</p>}
      </div>
    </form>
  );
}
