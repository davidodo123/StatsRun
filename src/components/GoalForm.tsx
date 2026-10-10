"use client";

import { useActionState } from "react";
import { saveGoal, type FormState } from "@/app/actions";
import type { Race } from "@/lib/races";
import { keepForm } from "./keepForm";

export function GoalForm({ race, defaultDate, hasProfile }: { race?: Race; defaultDate: string; hasProfile: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveGoal, {});
  return (
    <form onSubmit={keepForm(action)} className="space-y-4">
      {race && <input type="hidden" name="raceId" value={race.id} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {!race && (
          <>
            <label className="field sm:col-span-2">
              Nombre de la carrera
              <input className="input" name="name" placeholder="Ej.: Media Maratón de mi ciudad" required />
            </label>
            <label className="field">
              Distancia (km)
              <select className="input" name="distanceKm" defaultValue="21.0975">
                <option value="5">5K</option>
                <option value="10">10K</option>
                <option value="15">15K</option>
                <option value="21.0975">Media maratón</option>
                <option value="42.195">Maratón</option>
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
        <button className="btn" disabled={pending}>
          {pending ? "Generando plan…" : hasProfile ? "Generar mi plan" : "Guardar objetivo"}
        </button>
        {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
        {state.message && <p className="text-sm font-medium text-good-ink">✓ {state.message}</p>}
      </div>
    </form>
  );
}
