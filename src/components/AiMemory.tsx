"use client";

import { useActionState } from "react";
import { addAiPreference, deleteAiPreference } from "@/app/ai-actions";
import type { FormState } from "@/app/actions";
import type { AiPreference } from "@/lib/types";
import { keepForm } from "./keepForm";
import { translator, type Locale } from "@/lib/i18n";


/** Lo que la IA recuerda del atleta: se puede añadir y borrar. */
export function AiMemory({ list, locale = "es" }: { list: AiPreference[]; locale?: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<FormState, FormData>(addAiPreference, {});
  return (
    <div className="space-y-3 text-sm">
      {list.length ? (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {[...list].reverse().map((p) => (
            <li key={p.id} className="flex items-start gap-2 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block">{p.text}</span>
                <span className="text-xs text-muted">
                  {t(`mem.${p.area}`)} · {t(`mem.src.${p.source}`)}
                </span>
              </span>
              <form action={deleteAiPreference}>
                <input type="hidden" name="id" value={p.id} />
                <button className="px-1 text-muted hover:text-critical" aria-label={t("mem.olvidar", { texto: p.text })}>
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-2">{t("mem.nada")}</p>
      )}
      {/* tras guardar cambia la lista y el formulario se monta de nuevo, vacío */}
      <form key={list.length} onSubmit={keepForm(action)} className="flex flex-wrap gap-2">
        <input className="input min-w-0 basis-full sm:basis-0 sm:flex-1" name="text" maxLength={200} placeholder={t("mem.ph")} aria-label={t("mem.nueva")} />
        <select className="input flex-1 sm:w-auto sm:flex-none" name="area" defaultValue="todas" aria-label={t("mem.paraQue")}>
          <option value="todas">{t("mem.todas")}</option>
          <option value="plan">{t("mem.plan")}</option>
          <option value="fuerza">{t("mem.fuerza")}</option>
        </select>
        <button className="btn" disabled={pending}>
          {t("am.anadir")}
        </button>
      </form>
      {state.error && <p className="text-critical">{state.error}</p>}
    </div>
  );
}
