"use client";

import { useActionState } from "react";
import { saveGoal, type FormState } from "@/app/actions";
import type { Race } from "@/lib/races";
import { keepForm } from "./keepForm";

/** Datos ya conocidos de una carrera de fuera del catálogo (p. ej. de Cruzando la Meta). */
export interface GoalPreset {
  raceId: string;
  name: string;
  distances: number[];
  date: string;
}

const DISTANCES = [
  { km: 5, label: "5K" },
  { km: 10, label: "10K" },
  { km: 15, label: "15K" },
  { km: 21.0975, label: "Media maratón" },
  { km: 42.195, label: "Maratón" },
];
const kmLabel = (km: number) => DISTANCES.find((d) => Math.abs(d.km - km) < 0.05)?.label ?? `${km.toLocaleString("es-ES", { maximumFractionDigits: 2 })} km`;

export function GoalForm({ race, preset, defaultDate, hasProfile }: { race?: Race; preset?: GoalPreset; defaultDate: string; hasProfile: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveGoal, {});
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
                Nombre de la carrera
                <input className="input" name="name" placeholder="Ej.: Media Maratón de mi ciudad" required />
              </label>
            )}
            <label className="field">
              Distancia
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
          Fecha de la carrera
          <input className="input" type="date" name="date" defaultValue={defaultDate} required />
        </label>
        <label className="field">
          Tiempo objetivo (opcional)
          <input className="input" name="targetTime" placeholder="Ej.: 3:45:00 · vacío = terminar" />
        </label>
        <label className="field">
          Desnivel positivo (m)
          <input className="input" type="number" name="elevationGainM" defaultValue={race?.elevationGainM ?? 0} />
        </label>
        <label className="field">
          Temperatura esperada (°C)
          <input className="input" type="number" name="temperatureC" defaultValue={race?.temperatureC ?? 12} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn shrink-0" disabled={pending}>
          {pending ? "Generando plan…" : hasProfile ? "Generar mi plan" : "Guardar objetivo"}
        </button>
        {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
        {state.message && <p className="text-sm font-medium text-good-ink">✓ {state.message}</p>}
      </div>
    </form>
  );
}
