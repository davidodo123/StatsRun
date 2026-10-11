"use client";

import { useActionState } from "react";
import { addAiPreference, deleteAiPreference } from "@/app/ai-actions";
import type { FormState } from "@/app/actions";
import type { AiPreference } from "@/lib/types";
import { keepForm } from "./keepForm";

const AREA_LABEL: Record<AiPreference["area"], string> = { todas: "Todas", plan: "Plan", fuerza: "Fuerza" };
const SOURCE_LABEL: Record<AiPreference["source"], string> = { manual: "la escribiste tú", valoracion: "de una valoración", chat: "del chat" };

/** Lo que la IA recuerda del atleta: se puede añadir y borrar. */
export function AiMemory({ list }: { list: AiPreference[] }) {
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
                  {AREA_LABEL[p.area]} · {SOURCE_LABEL[p.source]}
                </span>
              </span>
              <form action={deleteAiPreference}>
                <input type="hidden" name="id" value={p.id} />
                <button className="px-1 text-muted hover:text-critical" aria-label={`Olvidar: ${p.text}`}>
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-2">Aún no recuerda nada. Valora sus respuestas, cuéntaselo en el chat o escríbelo aquí.</p>
      )}
      {/* tras guardar cambia la lista y el formulario se monta de nuevo, vacío */}
      <form key={list.length} onSubmit={keepForm(action)} className="flex flex-wrap gap-2">
        <input className="input min-w-0 basis-full sm:basis-0 sm:flex-1" name="text" maxLength={200} placeholder="Ej.: no quiero zancadas, entreno a las 7:00" aria-label="Nueva preferencia" />
        <select className="input flex-1 sm:w-auto sm:flex-none" name="area" defaultValue="todas" aria-label="Para qué IA">
          <option value="todas">Todas</option>
          <option value="plan">Plan</option>
          <option value="fuerza">Fuerza</option>
        </select>
        <button className="btn" disabled={pending}>
          Añadir
        </button>
      </form>
      {state.error && <p className="text-critical">{state.error}</p>}
    </div>
  );
}
