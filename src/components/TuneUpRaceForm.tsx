"use client";

import { useActionState } from "react";
import { addTuneUpRace, type FormState } from "@/app/actions";
import { addDays } from "@/lib/dates";

export function TuneUpRaceForm({ today, maxDate }: { today: string; maxDate: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addTuneUpRace, {});
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="field sm:col-span-2">
          Nombre
          <input className="input" name="name" placeholder="Ej.: 10K de San Silvestre" maxLength={80} />
        </label>
        <label className="field">
          Fecha
          <input className="input" type="date" name="date" min={addDays(today, 1)} max={addDays(maxDate, -1)} required />
        </label>
        <label className="field">
          Distancia (km)
          <input className="input" name="distanceKm" inputMode="decimal" list="tuneup-distances" placeholder="10" required />
          <datalist id="tuneup-distances">
            <option value="5" />
            <option value="10" />
            <option value="15" />
            <option value="21.0975">Media maratón</option>
          </datalist>
        </label>
        <label className="field">
          Tiempo objetivo (opcional)
          <input className="input" name="targetTime" placeholder="45:00" />
        </label>
      </div>
      <fieldset className="space-y-2 text-sm">
        <legend className="mb-1 font-medium">¿Cómo la vas a correr?</legend>
        <label className="flex items-start gap-2 rounded-xl border border-line p-3 has-checked:border-accent">
          <input type="radio" name="priority" value="B" defaultChecked className="mt-1" />
          <span>
            <strong>B · A tope</strong>
            <span className="block text-ink-2">Para medir tu forma o hacer marca. Llevas 2-3 días suaves antes y descansas después (un día suave por cada 3 km).</span>
          </span>
        </label>
        <label className="flex items-start gap-2 rounded-xl border border-line p-3 has-checked:border-accent">
          <input type="radio" name="priority" value="C" className="mt-1" />
          <span>
            <strong>C · Como entreno</strong>
            <span className="block text-ink-2">Por disfrutar del ambiente, a ritmo de umbral. Sustituye a la sesión de calidad y apenas cambia el plan.</span>
          </span>
        </label>
      </fieldset>
      <button className="btn" disabled={pending}>
        {pending ? "Reorganizando el plan…" : "Añadir a la temporada"}
      </button>
      {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
      {state.message && <p className="text-sm font-medium text-good-ink">✓ {state.message}</p>}
    </form>
  );
}
