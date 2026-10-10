"use client";

import { useActionState } from "react";
import { saveCustomExercise } from "@/app/strength-actions";
import type { FormState } from "@/app/actions";
import { CATEGORIES, EQUIPMENT, MUSCLES } from "@/lib/strength/labels";
import type { CustomExercise } from "@/lib/types";

/** Crear o editar un ejercicio propio. */
export function ExerciseForm({ exercise }: { exercise?: CustomExercise }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCustomExercise, {});
  const eq = new Set(exercise?.eq ?? ["corporal"]);
  return (
    <form action={action} className="space-y-4">
      {exercise && <input type="hidden" name="id" value={exercise.id} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="field">
          Nombre
          <input className="input" name="name" defaultValue={exercise?.name} placeholder="Ej.: Sentadilla con mochila" maxLength={60} required />
        </label>
        <label className="field">
          Tipo
          <select className="input" name="cat" defaultValue={exercise?.cat ?? "fuerza"}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <MuscleChecks name="muscles" legend="Músculos principales" checked={exercise?.muscles} />
      <MuscleChecks name="secondary" legend="Músculos secundarios (opcional)" checked={exercise?.secondary} />
      <fieldset>
        <legend className="mb-2 text-sm text-ink-2">Material</legend>
        <div className="flex flex-wrap gap-1.5">
          {EQUIPMENT.map((e) => (
            <label key={e.id} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs has-checked:border-accent has-checked:bg-surface-2">
              <input type="checkbox" name="eq" value={e.id} defaultChecked={eq.has(e.id)} className="sr-only" />
              <span aria-hidden>{e.icon}</span>
              {e.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        Cómo se hace (opcional, un paso por línea)
        <textarea className="input min-h-28" name="steps" defaultValue={exercise?.steps.join("\n")} maxLength={2000} />
      </label>
      <button className="btn" disabled={pending}>
        {pending ? "Guardando…" : exercise ? "Guardar cambios" : "Crear ejercicio"}
      </button>
      {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
    </form>
  );
}

function MuscleChecks({ name, legend, checked = [] }: { name: string; legend: string; checked?: string[] }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-ink-2">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {MUSCLES.map((m) => (
          <label key={m.id} className="rounded-full border border-line px-3 py-1 text-xs has-checked:border-accent has-checked:bg-accent has-checked:text-accent-ink">
            <input type="checkbox" name={name} value={m.id} defaultChecked={checked.includes(m.id)} className="sr-only" />
            {m.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
