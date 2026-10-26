"use client";

import { useActionState } from "react";
import { saveCustomExercise } from "@/app/strength-actions";
import type { FormState } from "@/app/actions";
import { CATEGORIES, EQUIPMENT, MUSCLES } from "@/lib/strength/labels";
import type { CustomExercise } from "@/lib/types";
import { keepForm } from "./keepForm";
import { translator, type Key, type Locale } from "@/lib/i18n";

/** Crear o editar un ejercicio propio. */
export function ExerciseForm({ exercise, locale }: { exercise?: CustomExercise; locale: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(saveCustomExercise, {});
  const eq = new Set(exercise?.eq ?? ["corporal"]);
  return (
    <form onSubmit={keepForm(action)} className="space-y-4">
      {exercise && <input type="hidden" name="id" value={exercise.id} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="field">
          {t("wl.nombre")}
          <input className="input" name="name" defaultValue={exercise?.name} placeholder={t("ef.nombrePh")} maxLength={60} required />
        </label>
        <label className="field">
          {t("eb.tipo")}
          <select className="input" name="cat" defaultValue={exercise?.cat ?? "fuerza"}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {t(`categoria.${c.id}` as Key)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <MuscleChecks name="muscles" legend={t("ef.principales")} checked={exercise?.muscles} t={t} />
      <MuscleChecks name="secondary" legend={t("ef.secundarios")} checked={exercise?.secondary} t={t} />
      <fieldset>
        <legend className="mb-2 text-sm text-ink-2">{t("eb.material")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {EQUIPMENT.map((e) => (
            <label key={e.id} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs has-checked:border-accent has-checked:bg-surface-2">
              <input type="checkbox" name="eq" value={e.id} defaultChecked={eq.has(e.id)} className="sr-only" />
              {t(`equipo.${e.id}` as Key)}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        {t("ef.pasos")}
        <textarea className="input min-h-28" name="steps" defaultValue={exercise?.steps.join("\n")} maxLength={2000} />
      </label>
      <button className="btn" disabled={pending}>
        {pending ? t("wl.guardando") : exercise ? t("ef.guardarCambios") : t("ef.crear")}
      </button>
      {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
    </form>
  );
}

function MuscleChecks({ name, legend, checked = [], t }: { name: string; legend: string; checked?: string[]; t: ReturnType<typeof translator> }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-ink-2">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {MUSCLES.map((m) => (
          <label key={m.id} className="rounded-full border border-line px-3 py-1 text-xs has-checked:border-accent has-checked:bg-accent has-checked:text-accent-ink">
            <input type="checkbox" name={name} value={m.id} defaultChecked={checked.includes(m.id)} className="sr-only" />
            {t(`musculo.${m.id}` as Key)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
