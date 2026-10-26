"use client";

import { useActionState } from "react";
import { savePlace } from "@/app/strength-actions";
import type { FormState } from "@/app/actions";
import { EQUIPMENT } from "@/lib/strength/labels";
import type { GymPlace } from "@/lib/types";
import { keepForm } from "./keepForm";
import { translator, type Key, type Locale } from "@/lib/i18n";

/** Alta o edición de un lugar: nombre y material que hay. */
export function PlaceForm({ place, locale }: { place?: GymPlace; locale: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(savePlace, {});
  const has = new Set(place?.equipment ?? ["corporal"]);
  return (
    <form onSubmit={keepForm(action)} className="space-y-3">
      {place && <input type="hidden" name="id" value={place.id} />}
      <label className="field">
        {t("wl.nombre")}
        <input className="input" name="name" defaultValue={place?.name} placeholder={t("pf.nombrePh")} maxLength={40} required />
      </label>
      <fieldset>
        <legend className="mb-2 text-sm text-ink-2">{t("pf.queHay")}</legend>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {EQUIPMENT.map((e) => (
            <label key={e.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm has-checked:border-accent has-checked:bg-surface-2">
              <input type="checkbox" name="eq" value={e.id} defaultChecked={has.has(e.id)} disabled={e.id === "corporal"} />
              {t(`equipo.${e.id}` as Key)}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        {t("pf.notas")}
        <input className="input" name="notes" defaultValue={place?.notes} placeholder={t("pf.notasPh")} maxLength={200} />
      </label>
      <button className="btn" disabled={pending}>
        {pending ? t("wl.guardando") : place ? t("ef.guardarCambios") : t("pf.anadir")}
      </button>
      {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
      {state.message && <p className="text-sm font-medium text-good-ink">✓ {state.message}</p>}
    </form>
  );
}
