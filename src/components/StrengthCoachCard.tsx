"use client";

import { Icon } from "./icons";
import Link from "next/link";
import { useActionState } from "react";
import { generateStrengthRoutines, type StrengthCoachForm } from "@/app/strength-actions";
import { keepForm } from "./keepForm";
import { AiRating } from "./AiRating";
import { DEFAULT_LOCALE, translator, type Locale } from "@/lib/i18n";

/** Le cuentas a la IA tu material y lo que sabes hacer, y crea tus rutinas de fuerza para la carrera. */
export function StrengthCoachCard({
  material,
  ability,
  summary,
  routines,
  model,
  refId,
  rating,
  locale = DEFAULT_LOCALE,
}: {
  material?: string;
  ability?: string;
  summary?: string;
  routines: { id: string; name: string }[];
  model: string;
  refId?: string;
  rating?: 1 | -1;
  locale?: Locale;
}) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<StrengthCoachForm, FormData>(generateStrengthRoutines, {});
  const list = state.routines ?? routines;
  return (
    <form onSubmit={keepForm(action)} className="space-y-3 text-sm">
      {(state.message || summary) && <p className="text-ink-2">{state.message || summary}</p>}
      {!pending && (state.message || summary) && <AiRating area="fuerza" refId={refId} rating={rating} locale={locale} />}
      {list.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {list.map((r) => (
            <li key={r.id}>
              <Link href={`/fuerza/rutinas/${r.id}`} className="flex items-center justify-between px-3 py-2 hover:bg-surface-2">
                <span className="truncate font-medium">{r.name}</span>
                <Icon name="chevron" className="h-4 w-4 text-accent" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {/* con rutinas ya hechas, el formulario va plegado */}
      <details open={!list.length} className="space-y-3">
        <summary className={`cursor-pointer list-none text-xs font-semibold text-accent ${list.length ? "" : "hidden"}`}>{t("fia.cambiarMaterial")}</summary>
        <div className="mt-3 space-y-3">
          <label className="field">
            {t("fia.queMaterial")}
            <textarea
              className="input min-h-20"
              name="material"
              defaultValue={material}
              maxLength={600}
              placeholder={t("fia.materialPh")}
              required
            />
          </label>
          <label className="field">
            {t("fia.queHaces")}
            <textarea
              className="input min-h-24"
              name="ability"
              defaultValue={ability}
              maxLength={1200}
              placeholder={t("fia.queHacesPh")}
            />
          </label>
          <button className="btn w-full" disabled={pending}>
            {pending ? t("fia.creando") : list.length ? t("fia.rehacer") : t("fia.crear")}
          </button>
          <p className="text-xs text-muted">{t("fia.planColoca", { modelo: model })}</p>
        </div>
      </details>
      {state.error && <p className="font-medium text-critical">✕ {state.error}</p>}
    </form>
  );
}
