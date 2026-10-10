"use client";

import Link from "next/link";
import { useActionState } from "react";
import { generateStrengthRoutines, type StrengthCoachForm } from "@/app/strength-actions";

/** Le cuentas a la IA tu material y lo que sabes hacer, y crea tus rutinas de fuerza para la carrera. */
export function StrengthCoachCard({
  material,
  ability,
  summary,
  routines,
  model,
}: {
  material?: string;
  ability?: string;
  summary?: string;
  routines: { id: string; name: string }[];
  model: string;
}) {
  const [state, action, pending] = useActionState<StrengthCoachForm, FormData>(generateStrengthRoutines, {});
  const list = state.routines ?? routines;
  return (
    <form action={action} className="space-y-3 text-sm">
      <label className="field">
        ¿Qué material tienes?
        <textarea
          className="input min-h-20"
          name="material"
          defaultValue={material}
          maxLength={600}
          placeholder="Ej.: kettlebell de 16 kg, mancuernas de 15 y 18 kg, cinta elástica y barra de dominadas"
          required
        />
      </label>
      <label className="field">
        ¿Qué sueles hacer o qué puedes hacer?
        <textarea
          className="input min-h-24"
          name="ability"
          defaultValue={ability}
          maxLength={1200}
          placeholder="Ej.: 3 × 15 flexiones, 3 × 6 dominadas, sentadilla goblet con la kettlebell 3 × 12, me cuesta el equilibrio en la búlgara"
        />
      </label>
      <button className="btn w-full" disabled={pending}>
        {pending ? "Creando tus rutinas… (≈ 30-60 s)" : list.length ? "↻ Rehacer mis rutinas con IA" : "Crear mis rutinas con IA"}
      </button>
      {state.error && <p className="font-medium text-critical">✕ {state.error}</p>}
      {(state.message || summary) && <p className="text-ink-2">{state.message || summary}</p>}
      {list.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {list.map((r) => (
            <li key={r.id}>
              <Link href={`/fuerza/rutinas/${r.id}`} className="flex items-center justify-between px-3 py-2 hover:bg-surface-2">
                <span className="truncate font-medium">{r.name}</span>
                <span className="text-accent">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">
        Usa solo ejercicios de la biblioteca que puedas hacer con tu material, en dos bloques: base (técnica) y fuerza (cargas y saltos para construcción y específico). El plan las coloca solas. Modelo: {model}.
      </p>
    </form>
  );
}
