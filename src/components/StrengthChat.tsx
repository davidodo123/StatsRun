"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { applyChatPlan, clearStrengthChat, saveChatActivity, saveChatRoutines, sendStrengthChat } from "@/app/strength-actions";
import type { FormState } from "@/app/actions";
import { fmtLoad, supersetLetters } from "@/lib/strength/workouts";
import { fmtDuration, fmtKm, fmtPace } from "@/lib/format";
import { WEEKDAYS, shortDate, weekday } from "@/lib/dates";
import type { Routine, StrengthChatMessage } from "@/lib/types";
import { Icon } from "./icons";
import { AiRating } from "./AiRating";

const SUGGESTIONS = [
  "Hoy he corrido 8 km en 45 minutos, me ha costado bastante",
  "Hazme una rutina de 3 días para ganar músculo en el gimnasio",
  "Esta semana solo puedo entrenar 3 días",
  "¿Cómo progreso en sentadilla si me he estancado?",
];

const SPORT: Record<string, string> = { run: "Carrera", walk: "Caminata", ride: "Bici", swim: "Natación", strength: "Fuerza", other: "Entrenamiento" };
const FEEL: Record<string, string> = { muy_facil: "Muy fácil", facil: "Fácil", bien: "Bien", duro: "Duro", muy_duro: "Muy duro" };

/** El entreno que contó, listo para guardar. */
function ActivityProposal({ m }: { m: StrengthChatMessage }) {
  const a = m.activity!;
  const pace = a.sport === "run" && a.distanceKm ? a.durationSec / a.distanceKm : undefined;
  const facts = [
    a.distanceKm && `${fmtKm(a.distanceKm, 2)} km`,
    fmtDuration(a.durationSec),
    pace && `${fmtPace(pace)} /km`,
    a.elevationGainM && `+${a.elevationGainM} m`,
    a.avgHr && `${a.avgHr} ppm`,
    a.rpe && `RPE ${a.rpe}`,
    a.feel && FEEL[a.feel],
  ].filter(Boolean);
  return (
    <div className="mt-3 space-y-2">
      <div className="rounded-xl border border-line bg-surface p-3">
        <p className="text-xs text-muted">
          {SPORT[a.sport]} · {shortDate(a.date)}
          {a.time && ` · ${a.time}`}
        </p>
        <strong className="text-sm">{a.name}</strong>
        <p className="mt-1 text-xs text-ink-2">{facts.join(" · ")}</p>
        {a.exercises?.length ? (
          <ul className="mt-1 space-y-0.5 text-xs text-ink-2">
            {a.exercises.map((e, i) => (
              <li key={i}>
                {e.name} · {e.sets.map((s) => `${e.bw || s.kg ? `${fmtLoad(e.bw, s.kg)} × ` : ""}${s.reps}`).join(", ")}
              </li>
            ))}
          </ul>
        ) : null}
        {a.feelings && <p className="mt-1 text-xs italic text-ink-2">«{a.feelings}»</p>}
      </div>
      {m.activityId ? (
        <p className="flex items-center gap-1 text-xs font-semibold text-good-ink">
          <Icon name="check" className="h-3.5 w-3.5" /> Guardado.{" "}
          <Link href={`/actividad/${encodeURIComponent(m.activityId)}`} className="text-accent underline">
            Ver el entreno
          </Link>
        </p>
      ) : (
        <form action={saveChatActivity}>
          <input type="hidden" name="at" value={m.at} />
          <button className="btn w-full py-2 text-sm">Guardar entreno</button>
        </form>
      )}
    </div>
  );
}

/** El cambio del plan que pidió: se aplica con un toque (la IA reajusta los próximos 14 días). */
function PlanProposal({ m }: { m: StrengthChatMessage }) {
  const [state, apply, pending] = useActionState<FormState, FormData>(applyChatPlan, {});
  const done = m.planResult ?? state.message;
  return (
    <div className="mt-3 space-y-2">
      <div className="rounded-xl border border-line bg-surface p-3 text-xs text-ink-2">
        <strong className="block text-sm text-ink">Cambio en el plan</strong>
        {m.planDays?.length ? <p>Sin entrenar: {m.planDays.map((d) => `${WEEKDAYS[weekday(d)].slice(0, 3).toLowerCase()} ${shortDate(d)}`).join(", ")}. Las sesiones se mueven a tus días libres.</p> : null}
        {m.planRequest && <p>{m.planRequest}</p>}
      </div>
      {done ? (
        <p className="text-xs font-semibold text-good-ink">
          <Icon name="check" className="mr-1 h-3.5 w-3.5 align-[-2px]" />
          {done}{" "}
          <Link href="/plan/actual" className="text-accent underline">
            Ver el plan
          </Link>
        </p>
      ) : (
        <form action={apply}>
          <input type="hidden" name="at" value={m.at} />
          <button className="btn w-full py-2 text-sm" disabled={pending}>
            {pending ? "Ajustando el plan… (hasta un minuto)" : "Aplicar al plan"}
          </button>
          {state.error && <p className="mt-1 text-xs font-medium text-critical">✕ {state.error}</p>}
        </form>
      )}
    </div>
  );
}

type Recognition = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
const speechApi = () => {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

/** Botón de micrófono: dicta en español y añade lo dicho al mensaje. Solo sale si el navegador sabe hacerlo. */
function MicButton({ onText }: { onText: (t: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | undefined>(undefined);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- el reconocimiento de voz solo existe en el navegador
  useEffect(() => setSupported(Boolean(speechApi())), []);
  if (!supported) return null;
  const toggle = () => {
    if (listening) return rec.current?.stop();
    const Api = speechApi();
    if (!Api) return;
    const r = new Api();
    r.lang = "es-ES";
    r.interimResults = false;
    r.continuous = true;
    r.onresult = (e) => {
      const said = Array.from(e.results)
        .filter((x) => x.isFinal)
        .map((x) => x[0].transcript)
        .join(" ")
        .trim();
      if (said) onText(said);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${listening ? "animate-pulse bg-critical text-white" : "bg-surface-2 text-ink-2"}`}
      aria-label={listening ? "Dejar de escuchar" : "Hablar"}
      aria-pressed={listening}
      title={listening ? "Toca para terminar" : "Cuéntaselo hablando"}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM5 11a7 7 0 0014 0M12 18v3" />
      </svg>
    </button>
  );
}

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

/** Chat con el entrenador IA: dudas de running y fuerza, rutinas, entrenos que le cuentas y cambios del plan, cada uno con su botón. */
export function StrengthChat({ messages, names, ratings = {} }: { messages: StrengthChatMessage[]; names: Record<string, string>; ratings?: Record<string, 1 | -1> }) {
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
            Cuéntale lo que has entrenado, pídele una rutina o un cambio del plan, o pregúntale lo que quieras.
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
            {m.role === "assistant" && m.activity ? <ActivityProposal m={m} /> : null}
            {m.role === "assistant" && (m.planRequest || m.planDays?.length) ? <PlanProposal m={m} /> : null}
            {m.role === "assistant" && (
              <div className="mt-3 border-t border-line pt-2">
                <AiRating area="chat" refId={m.at} rating={ratings[m.at]} />
              </div>
            )}
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
          placeholder="Escribe o cuéntaselo hablando…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={1500}
          required
          aria-label="Mensaje"
        />
        <MicButton onText={(t) => setDraft((d) => (d.trim() ? `${d.trim()} ${t}` : t))} />
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
