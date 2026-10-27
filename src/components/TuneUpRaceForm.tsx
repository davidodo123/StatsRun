"use client";

import { useActionState, useState } from "react";
import { addTuneUpRace, type FormState } from "@/app/actions";
import { addDays } from "@/lib/dates";
import { keepForm } from "./keepForm";
import { translator, type Locale } from "@/lib/i18n";

export function TuneUpRaceForm({ today, maxDate, locale = "es" }: { today: string; maxDate: string; locale?: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(addTuneUpRace, {});
  // un objetivo A puede ir después de la carrera principal (hasta dos años); B y C, antes del último objetivo
  const [priority, setPriority] = useState("B");
  return (
    <form onSubmit={keepForm(action)} className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="field sm:col-span-2">
          {t("car.nombre")}
          <input className="input" name="name" placeholder={t("car.nombrePh")} maxLength={80} />
        </label>
        <label className="field">
          {t("car.fecha")}
          <input className="input" type="date" name="date" min={addDays(today, 1)} max={priority === "A" ? addDays(today, 730) : addDays(maxDate, -1)} required />
        </label>
        <label className="field">
          {t("car.distancia")}
          <input className="input" name="distanceKm" inputMode="decimal" list="tuneup-distances" placeholder="10" required />
          <datalist id="tuneup-distances">
            <option value="5" />
            <option value="10" />
            <option value="15" />
            <option value="21.0975">{t("car.media")}</option>
          </datalist>
        </label>
        <label className="field">
          {t("car.tiempoObj")}
          <input className="input" name="targetTime" placeholder="45:00" />
        </label>
      </div>
      <fieldset className="space-y-2 text-sm">
        <legend className="mb-1 font-medium">{t("car.como")}</legend>
        <label className="flex items-start gap-2 rounded-xl border border-line p-3 has-checked:border-accent">
          <input type="radio" name="priority" value="A" checked={priority === "A"} onChange={() => setPriority("A")} className="mt-1" />
          <span>
            <strong>{t("car.A")}</strong>
            <span className="block text-ink-2">{t("car.Ad")}</span>
          </span>
        </label>
        <label className="flex items-start gap-2 rounded-xl border border-line p-3 has-checked:border-accent">
          <input type="radio" name="priority" value="B" checked={priority === "B"} onChange={() => setPriority("B")} className="mt-1" />
          <span>
            <strong>{t("car.B")}</strong>
            <span className="block text-ink-2">{t("car.Bd")}</span>
          </span>
        </label>
        <label className="flex items-start gap-2 rounded-xl border border-line p-3 has-checked:border-accent">
          <input type="radio" name="priority" value="C" checked={priority === "C"} onChange={() => setPriority("C")} className="mt-1" />
          <span>
            <strong>{t("car.C")}</strong>
            <span className="block text-ink-2">{t("car.Cd")}</span>
          </span>
        </label>
      </fieldset>
      <button className="btn" disabled={pending}>
        {pending ? t("car.reorganizando") : t("car.anadirTemp")}
      </button>
      {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
      {state.message && <p className="text-sm font-medium text-good-ink">✓ {state.message}</p>}
    </form>
  );
}
