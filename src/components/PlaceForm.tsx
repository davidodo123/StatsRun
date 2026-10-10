"use client";

import { useActionState } from "react";
import { savePlace } from "@/app/strength-actions";
import type { FormState } from "@/app/actions";
import { EQUIPMENT } from "@/lib/strength/labels";
import type { GymPlace } from "@/lib/types";

/** Alta o edición de un lugar: nombre y material que hay. */
export function PlaceForm({ place }: { place?: GymPlace }) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePlace, {});
  const has = new Set(place?.equipment ?? ["corporal"]);
  return (
    <form action={action} className="space-y-3">
      {place && <input type="hidden" name="id" value={place.id} />}
      <label className="field">
        Nombre
        <input className="input" name="name" defaultValue={place?.name} placeholder="Casa, Gimnasio, Trastero…" maxLength={40} required />
      </label>
      <fieldset>
        <legend className="mb-2 text-sm text-ink-2">¿Qué material hay?</legend>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {EQUIPMENT.map((e) => (
            <label key={e.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm has-checked:border-accent has-checked:bg-surface-2">
              <input type="checkbox" name="eq" value={e.id} defaultChecked={has.has(e.id)} disabled={e.id === "corporal"} />
              <span aria-hidden>{e.icon}</span>
              {e.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        Notas (opcional)
        <input className="input" name="notes" defaultValue={place?.notes} placeholder="Mancuernas de 2 a 20 kg, kettlebell de 16 kg…" maxLength={200} />
      </label>
      <button className="btn" disabled={pending}>
        {pending ? "Guardando…" : place ? "Guardar cambios" : "Añadir lugar"}
      </button>
      {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
      {state.message && <p className="text-sm font-medium text-good-ink">✓ {state.message}</p>}
    </form>
  );
}
