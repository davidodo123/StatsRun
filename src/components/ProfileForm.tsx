"use client";

import { useActionState } from "react";
import { saveProfile, type FormState } from "@/app/actions";
import type { Profile } from "@/lib/types";
import { WEEKDAYS } from "@/lib/dates";
import { availableDaysOf } from "@/lib/engine/planner";

function fmtT(sec?: number) {
  if (!sec) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

const LEVELS = [
  { v: "nuevo", l: "Empiezo de cero", d: "No corro o menos de 1 mes" },
  { v: "principiante", l: "Principiante", d: "Corro hace < 1 año, hasta ~25 km/sem" },
  { v: "intermedio", l: "Intermedio", d: "1-3 años, 25-50 km/sem, alguna carrera" },
  { v: "avanzado", l: "Avanzado", d: "3+ años, 50+ km/sem, entreno estructurado" },
];

export function ProfileForm({ profile }: { profile?: Profile }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfile, {});
  const p = profile;
  const avail = availableDaysOf(p ?? { daysPerWeek: 4, longRunDay: 6 });
  return (
    <form action={action} className="space-y-6">
      <fieldset className="rounded-2xl border border-line bg-surface p-4 md:p-5">
        <legend className="px-1 text-sm font-semibold">Datos físicos</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <label className="field">
            Nombre
            <input className="input" name="name" defaultValue={p?.name} placeholder="Tu nombre" />
          </label>
          <label className="field">
            Sexo
            <select className="input" name="sex" defaultValue={p?.sex ?? "male"}>
              <option value="male">Hombre</option>
              <option value="female">Mujer</option>
            </select>
          </label>
          <label className="field">
            Edad
            <input className="input" name="age" type="number" min={10} max={100} required defaultValue={p?.age} />
          </label>
          <label className="field">
            Peso (kg)
            <input className="input" name="weightKg" type="number" step="0.1" required defaultValue={p?.weightKg} />
          </label>
          <label className="field">
            Altura (cm)
            <input className="input" name="heightCm" type="number" required defaultValue={p?.heightCm} />
          </label>
          <div className="hidden md:block" />
          <label className="field">
            FC máxima (opcional)
            <input className="input" name="hrMax" type="number" defaultValue={p?.hrMax} placeholder="Se estima por edad" />
          </label>
          <label className="field">
            FC en reposo (opcional)
            <input className="input" name="hrRest" type="number" defaultValue={p?.hrRest} placeholder="60" />
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-line bg-surface p-4 md:p-5">
        <legend className="px-1 text-sm font-semibold">Experiencia</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {LEVELS.map((lv) => (
            <label key={lv.v} className="flex cursor-pointer gap-2 rounded-xl border border-line p-3 has-[:checked]:border-accent has-[:checked]:bg-surface-2">
              <input type="radio" name="level" value={lv.v} defaultChecked={(p?.level ?? "principiante") === lv.v} className="mt-1 accent-[var(--accent)]" />
              <span>
                <span className="block text-sm font-semibold">{lv.l}</span>
                <span className="block text-xs text-ink-2">{lv.d}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <label className="field">
            Años corriendo
            <input className="input" name="yearsRunning" type="number" step="0.5" defaultValue={p?.yearsRunning ?? 0} />
          </label>
          <label className="field">
            Km por semana actuales
            <input className="input" name="weeklyKm" type="number" defaultValue={p?.weeklyKm ?? 0} />
          </label>
          <label className="field">
            Tirada más larga reciente (km)
            <input className="input" name="longestRunKm" type="number" step="0.5" defaultValue={p?.longestRunKm ?? 0} />
          </label>
          <label className="field">
            Marca reciente: distancia
            <select className="input" name="raceDistanceKm" defaultValue={p?.recentRace?.distanceKm ?? ""}>
              <option value="">Ninguna</option>
              <option value="5">5K</option>
              <option value="10">10K</option>
              <option value="21.0975">Media maratón</option>
              <option value="42.195">Maratón</option>
            </select>
          </label>
          <label className="field">
            Marca reciente: tiempo
            <input className="input" name="raceTime" placeholder="h:mm:ss o mm:ss" defaultValue={fmtT(p?.recentRace?.timeSec)} />
          </label>
        </div>
        <p className="mt-2 text-xs text-muted">Si conectas Strava, el volumen y el VDOT se calculan con tus actividades reales.</p>
      </fieldset>

      <fieldset className="rounded-2xl border border-line bg-surface p-4 md:p-5">
        <legend className="px-1 text-sm font-semibold">Disponibilidad</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="sm:col-span-2 md:col-span-3">
            <p className="field">Días en los que puedes entrenar</p>
            <div className="mt-2 grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((d, i) => (
                <label
                  key={d}
                  className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-line px-1 py-2 text-xs font-semibold has-[:checked]:border-accent has-[:checked]:bg-surface-2"
                >
                  <input type="checkbox" name="availableDays" value={i} defaultChecked={avail.includes(i)} className="accent-[var(--accent)]" />
                  <span className="sm:hidden">{d.slice(0, 2)}</span>
                  <span className="hidden sm:inline">{d}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">
              El plan solo pondrá carrera en esos días (mínimo 2). Para días sueltos en que no puedas (viajes, turnos), márcalos en la página del plan.
            </p>
          </div>
          <label className="field">
            Día de la tirada larga
            <select className="input" name="longRunDay" defaultValue={p?.longRunDay ?? 6}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Sesiones de fuerza / semana
            <select className="input" name="strengthPerWeek" defaultValue={p?.strengthPerWeek ?? 1}>
              <option value={0}>Ninguna</option>
              <option value={1}>1</option>
              <option value={2}>2 (recomendado)</option>
            </select>
          </label>
          <label className="field sm:col-span-2 md:col-span-3">
            Lesiones o molestias (opcional)
            <input className="input" name="injuries" defaultValue={p?.injuries} placeholder="Ej.: fascitis plantar en 2024, rodilla derecha sensible" />
          </label>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button className="btn" disabled={pending}>
          {pending ? "Guardando…" : "Guardar perfil"}
        </button>
        {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
        {state.message && <p className="text-sm font-medium text-good-ink">✓ {state.message}</p>}
      </div>
    </form>
  );
}
