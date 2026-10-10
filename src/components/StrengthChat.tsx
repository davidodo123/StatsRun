"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { clearStrengthChat, saveChatRoutines, sendStrengthChat } from "@/app/strength-actions";
import type { FormState } from "@/app/actions";
import { fmtLoad, supersetLetters } from "@/lib/strength/workouts";
import type { Routine, StrengthChatMessage } from "@/lib/types";
import { Icon } from "./icons";

const SUGGESTIONS = [
  "Hazme una rutina de 3 días para ganar músculo en el gimnasio",
  "Solo tengo mancuernas y 2 días a la semana: ¿qué hago?",
  "¿Cómo progreso en sentadilla si me he estancado?",
  "Me molesta la rodilla al hacer zancadas, ¿qué cambio?",
];

function Proposal({ m, names }: { m: StrengthChatMessage; names: Record<string, string> }) {
  return (
    <div className="mt-3 space-y-2">
      {m.routines!.map((r: Routine, i) => {
        const letters = supersetLetters(r.exercises);
        return (
          <div key={i} className="rounded-xl border border-line bg-surface p-3">
            <strong className="text-sm">{r.name}</strong>
            <ul className="mt-1 space-y-0.5 text-xs text-ink-2">
              {r.exercises.map((e, j) => (
                <li key={j}>
                  {letters[j] && <span className="mr-1 font-semibold text-accent">{letters[j]}</span>}
                  {names[e.exerciseId] ?? e.exerciseId} · {e.sets.length} × {e.sets[0]?.reps ?? "–"}
                  {(e.bw || e.sets[0]?.kg) && ` · ${fmtLoad(e.bw, e.sets[0]?.kg)}`}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {m.saved ? (
        <p className="flex items-center gap-1 text-xs font-semibold text-good-ink">
          <Icon name="check" className="h-3.5 w-3.5" /> Guardadas en la carpeta «Entrenador IA».{" "}
          <Link href="/fuerza" className="text-accent underline">
            Ver mis rutinas
          </Link>
        </p>
      ) : (
        <form action={saveChatRoutines}>
          <input type="hidden" name="at" value={m.at} />
          <button className="btn w-full py-2 text-sm">Guardar {m.routines!.length === 1 ? "la rutina" : `las ${m.routines!.length} rutinas`}</button>
        </form>
      )}
    </div>
  );
}

/** Chat con el entrenador de fuerza: preguntas, consejos y rutinas que se guardan con un toque. */
export function StrengthChat({ messages, names }: { messages: StrengthChatMessage[]; names: Record<string, string> }) {
  const [state, send, pending] = useActionState<FormState, FormData>(sendStrengthChat, {});
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [messages.length, pending]);

  return (
    <div className="space-y-3">
      {!messages.length && !pending && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm text-ink-2">
            Pregúntale lo que quieras sobre fuerza: una rutina para tus objetivos, cómo progresar, qué hacer con una molestia o cómo encajarla con la carrera. Conoce tu perfil, tu material y lo que has entrenado.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setDraft(s)} className="rounded-full border border-line px-3 py-1.5 text-left text-xs hover:border-accent">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.map((m) => (
        <div key={m.at + m.role} className={m.role === "user" ? "flex justify-end" : ""}>
          <div className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "bg-accent text-accent-ink" : "border border-line bg-surface-2"}`}>
            <p className="whitespace-pre-line">{m.text}</p>
            {m.role === "assistant" && m.routines?.length ? <Proposal m={m} names={names} /> : null}
          </div>
        </div>
      ))}
      {pending && (
        <>
          <div className="flex justify-end">
            <p className="max-w-[92%] whitespace-pre-line rounded-2xl bg-accent px-4 py-3 text-sm text-accent-ink">{sent}</p>
          </div>
          <p className="flex items-center gap-2 text-sm text-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> Pensando… (puede tardar hasta un minuto si prepara rutinas)
          </p>
        </>
      )}
      {state.error && !pending && <p className="text-sm font-medium text-critical">{state.error}</p>}
      <div ref={end} />

      <form
        action={(fd) => {
          setSent(String(fd.get("message") ?? ""));
          setDraft("");
          send(fd);
        }}
        className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 flex items-end gap-2 rounded-2xl border border-line bg-surface p-2 shadow-lg md:bottom-4"
      >
        <textarea
          name="message"
          className="input max-h-40 min-h-11 flex-1 resize-none border-0 bg-transparent"
          rows={2}
          placeholder="Escribe al entrenador…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={1500}
          required
          aria-label="Mensaje"
        />
        <button className="btn px-4" disabled={pending || draft.trim().length < 2}>
          Enviar
        </button>
      </form>
      {messages.length > 0 && (
        <form action={clearStrengthChat} onSubmit={(e) => !confirm("¿Borrar la conversación? Las rutinas que guardaste se quedan.") && e.preventDefault()} className="text-center">
          <button className="text-xs text-muted underline">Empezar una conversación nueva</button>
        </form>
      )}
    </div>
  );
}
