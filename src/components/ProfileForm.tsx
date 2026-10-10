"use client";

import { useActionState, useState } from "react";
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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Availability initialDays={avail} initialLong={p?.longRunDay ?? 6} />
          <div className="sm:col-span-2">
            <p className="field">Sesiones de fuerza por semana</p>
            <Stepper name="strengthPerWeek" initial={p?.strengthPerWeek ?? 2} min={0} max={4} />
            <p className="mt-1 text-xs text-muted">Recomendado: 2-3 (Balsalobre 2016). El plan las reparte: pierna, cadena posterior y tren superior.</p>
          </div>
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

const SHORT = ["L", "M", "X", "J", "V", "S", "D"];

/** Días disponibles (chips) y día de la tirada larga, que tiene que ser uno de ellos. */
function Availability({ initialDays, initialLong }: { initialDays: number[]; initialLong: number }) {
  const [days, setDays] = useState(initialDays);
  const [long, setLong] = useState(initialDays.includes(initialLong) ? initialLong : (initialDays.at(-1) ?? 6));
  const toggle = (i: number) => {
    const next = days.includes(i) ? days.filter((d) => d !== i) : [...days, i].sort((a, b) => a - b);
    setDays(next);
    // si se quita el día de la tirada larga, pasa al último día marcado
    if (!next.includes(long) && next.length) setLong(next.at(-1)!);
  };
  const chip = (on: boolean) =>
    `grid h-11 place-items-center rounded-xl border text-sm font-bold transition ${on ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface-2 text-ink-2 hover:text-ink"}`;
  return (
    <>
      <div className="sm:col-span-2">
        <p className="field">Días en los que puedes entrenar</p>
        <div className="mt-2 grid grid-cols-7 gap-1.5" role="group" aria-label="Días en los que puedes entrenar">
          {WEEKDAYS.map((d, i) => (
            <label key={d} className={`cursor-pointer ${chip(days.includes(i))}`} title={d}>
              <input type="checkbox" name="availableDays" value={i} checked={days.includes(i)} onChange={() => toggle(i)} className="sr-only" aria-label={d} />
              {SHORT[i]}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted">
          {days.length} {days.length === 1 ? "día" : "días"} · el plan solo pondrá carrera en esos días (mínimo 2). Para días sueltos en que no puedas, márcalos en la página del plan.
        </p>
      </div>
      <div className="sm:col-span-2">
        <p className="field">Día de la tirada larga</p>
        <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Día de la tirada larga">
          {days.map((i) => (
            <label key={i} className={`cursor-pointer px-3 ${chip(long === i)}`}>
              <input type="radio" name="longRunDay" value={i} checked={long === i} onChange={() => setLong(i)} className="sr-only" />
              {WEEKDAYS[i]}
            </label>
          ))}
          {!days.length && <span className="text-xs text-muted">Marca antes tus días.</span>}
        </div>
      </div>
    </>
  );
}

/** Número con botones − y + (y también se puede escribir). */
function Stepper({ name, initial, min, max }: { name: string; initial: number; min: number; max: number }) {
  const [v, setV] = useState(String(initial));
  const n = Math.min(max, Math.max(min, Number(v) || 0));
  const btn = "grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface-2 text-xl font-bold disabled:opacity-30";
  return (
    <div className="mt-2 flex items-center gap-2">
      <button type="button" className={btn} onClick={() => setV(String(n - 1))} disabled={n <= min} aria-label="Menos">
        −
      </button>
      <input
        className="input no-spin h-11 w-16 text-center text-lg font-bold"
        name={name}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => setV(String(n))}
        aria-label="Sesiones de fuerza por semana"
      />
      <button type="button" className={btn} onClick={() => setV(String(n + 1))} disabled={n >= max} aria-label="Más">
        +
      </button>
    </div>
  );
}

