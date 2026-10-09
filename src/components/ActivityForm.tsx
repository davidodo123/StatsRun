"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveActivity, type FormState } from "@/app/actions";
import type { Activity, Feel, PlannedSession } from "@/lib/types";
import { fmtDuration, fmtPace, parseTime } from "@/lib/format";

const RPE: Record<number, string> = {
  1: "Muy muy suave",
  2: "Muy suave",
  3: "Suave, conversación fácil",
  4: "Cómodo",
  5: "Moderado",
  6: "Algo duro",
  7: "Duro, frases cortas",
  8: "Muy duro",
  9: "Casi al máximo",
  10: "Máximo esfuerzo",
};

export interface ActivityFormInitial {
  id?: string;
  sessionId?: string;
  sport: Activity["sport"];
  name: string;
  date: string;
  time: string;
  distanceKm?: number;
  duration?: string;
  elevationGainM?: number;
  avgHr?: number;
  maxHr?: number;
  avgCadence?: number;
  steps?: number;
  maxAltitudeM?: number;
  rpe?: number;
  feel?: Feel;
  feelings?: string;
  notes?: string;
  with?: string[];
}

const FEELS: { value: Feel; label: string }[] = [
  { value: "muy_facil", label: "😌 Muy fácil" },
  { value: "facil", label: "🙂 Fácil" },
  { value: "bien", label: "👍 Bien" },
  { value: "duro", label: "😓 Duro" },
  { value: "muy_duro", label: "🥵 Muy duro" },
];

export function ActivityForm({
  initial,
  session,
  today,
  friends = [],
}: {
  initial: ActivityFormInitial;
  session?: PlannedSession;
  today: string;
  friends?: { id: string; name: string; username: string }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveActivity, {});
  const [sport, setSport] = useState(initial.sport);
  const [dist, setDist] = useState(initial.distanceKm?.toString() ?? "");
  const [dur, setDur] = useState(initial.duration ?? "");
  const [paceIn, setPaceIn] = useState("");
  const [rpe, setRpe] = useState(initial.rpe ?? 5);
  const [more, setMore] = useState(Boolean(initial.avgHr || initial.maxHr || initial.avgCadence));

  const km = Number(dist.replace(",", "."));
  const sec = parseTime(dur);
  const typedPace = parseTime(paceIn);
  const hasDistance = sport !== "strength";
  const hasSteps = sport === "run" || sport === "walk";
  // con dos de los tres datos (distancia, tiempo, ritmo) se calcula el tercero; el tiempo manda si están los tres
  const pace = km > 0 && sec ? sec / km : typedPace;
  const derivedSec = !sec && km > 0 && typedPace ? typedPace * km : undefined;

  return (
    <form action={action} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {initial.sessionId && <input type="hidden" name="sessionId" value={initial.sessionId} />}

      {session && (
        <div className="rounded-xl border border-line bg-surface-2 p-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Sesión planificada</p>
          <p className="font-semibold">{session.title}</p>
          <p className="text-ink-2">
            {session.distanceKm > 0 && `${session.distanceKm} km · `}~{session.durationMin} min
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          Deporte
          <select className="input" name="sport" value={sport} onChange={(e) => setSport(e.target.value as Activity["sport"])}>
            <option value="run">Correr</option>
            <option value="strength">Fuerza / gimnasio</option>
            <option value="ride">Bici</option>
            <option value="swim">Natación</option>
            <option value="walk">Caminar / senderismo</option>
            <option value="other">Otro</option>
          </select>
        </label>
        <label className="field">
          Nombre de la sesión
          <input className="input" name="name" defaultValue={initial.name} placeholder="Ej.: Carrera de mañana" />
        </label>
        <label className="field">
          Fecha
          <input className="input" type="date" name="date" max={today} defaultValue={initial.date} required />
        </label>
        <label className="field">
          Hora de inicio
          <input className="input" type="time" name="time" defaultValue={initial.time} />
        </label>
      </div>

      <div className={`grid gap-4 ${hasDistance ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {hasDistance && (
          <label className="field">
            Distancia (km)
            <input className="input" name="distanceKm" inputMode="decimal" value={dist} onChange={(e) => setDist(e.target.value)} placeholder="10,5" />
          </label>
        )}
        <label className="field">
          {hasDistance ? "Tiempo en movimiento" : "Duración"}
          <input
            className="input"
            name="duration"
            value={dur}
            onChange={(e) => setDur(e.target.value)}
            placeholder={derivedSec ? fmtDuration(derivedSec) : "h:mm:ss o mm:ss"}
            required={!hasDistance || !derivedSec}
          />
        </label>
        {hasDistance && (
          <label className="field">
            Ritmo medio (/km)
            <input
              className="input"
              name="pace"
              inputMode="numeric"
              value={paceIn}
              onChange={(e) => setPaceIn(e.target.value)}
              placeholder={km > 0 && sec ? fmtPace(sec / km) : "m:ss"}
            />
          </label>
        )}
      </div>

      {hasDistance && (
        <p className="text-sm text-ink-2 tabular">
          {pace && (km > 0 || typedPace) ? (
            <>
              Ritmo medio: <strong className="text-ink">{fmtPace(pace)} /km</strong> · {(3600 / pace).toFixed(1)} km/h
              {derivedSec && <> · Tiempo: <strong className="text-ink">{fmtDuration(derivedSec)}</strong></>}
            </>
          ) : (
            "Copia de Strava la distancia y el tiempo en movimiento (o el ritmo medio): el que falte se calcula."
          )}
        </p>
      )}

      {hasDistance && (
        <div className={`grid gap-4 ${hasSteps ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <label className="field">
            Desnivel positivo (m)
            <input className="input" type="number" min={0} name="elevationGainM" defaultValue={initial.elevationGainM ?? ""} placeholder="0" />
          </label>
          <label className="field">
            Altitud máx. (m)
            <input className="input" type="number" name="maxAltitudeM" defaultValue={initial.maxAltitudeM ?? ""} />
          </label>
          {hasSteps && (
            <label className="field">
              Pasos
              <input className="input" type="number" min={0} name="steps" defaultValue={initial.steps ?? ""} />
            </label>
          )}
        </div>
      )}

      <div>
        <label className="field" htmlFor="rpe">
          Esfuerzo percibido: <strong className="text-ink">{rpe} — {RPE[rpe]}</strong>
        </label>
        <input id="rpe" type="range" name="rpe" min={1} max={10} value={rpe} onChange={(e) => setRpe(Number(e.target.value))} className="mt-2 w-full accent-[var(--accent)]" />
        <div className="flex justify-between text-[11px] text-muted">
          <span>1 Muy suave</span>
          <span>5 Moderado</span>
          <span>10 Máximo</span>
        </div>
        <p className="mt-1 text-xs text-muted">Si no llevas pulsómetro, con esto calculamos la carga del entreno.</p>
      </div>

      <fieldset className="rounded-xl border border-line bg-surface-2 p-4">
        <legend className="px-1 text-sm font-semibold">¿Cómo te has sentido?</legend>
        <div className="flex flex-wrap gap-2">
          {FEELS.map((f) => (
            <label key={f.value} className="cursor-pointer">
              <input type="radio" name="feel" value={f.value} defaultChecked={initial.feel === f.value} className="peer sr-only" />
              <span className="block rounded-full border border-line bg-surface px-3 py-1.5 text-sm peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                {f.label}
              </span>
            </label>
          ))}
        </div>
        <textarea
          className="input mt-3 min-h-24"
          name="feelings"
          defaultValue={initial.feelings}
          maxLength={1000}
          placeholder="Ej.: Las series se me hicieron fáciles, podría haber ido más rápido. / Me costó mucho, piernas cargadas desde el kilómetro 6. / Molestia en el gemelo derecho."
        />
        <p className="mt-1 text-xs text-muted">
          La IA lo lee al guardar y ajusta tus próximos entrenos: si se te hace fácil, sube la exigencia; si se te hace duro o tienes molestias, la baja.
        </p>
      </fieldset>

      <div>
        <button type="button" onClick={() => setMore(!more)} className="text-sm font-semibold text-accent">
          {more ? "− Ocultar" : "+ Añadir"} datos del reloj (FC, cadencia)
        </button>
        {more && (
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <label className="field">
              FC media
              <input className="input" type="number" name="avgHr" defaultValue={initial.avgHr ?? ""} />
            </label>
            <label className="field">
              FC máxima
              <input className="input" type="number" name="maxHr" defaultValue={initial.maxHr ?? ""} />
            </label>
            {sport === "run" && (
              <label className="field">
                Cadencia (ppm)
                <input className="input" type="number" name="avgCadence" defaultValue={initial.avgCadence ?? ""} />
              </label>
            )}
          </div>
        )}
      </div>

      <label className="field">
        Otras notas
        <textarea className="input min-h-16" name="notes" defaultValue={initial.notes} placeholder="Clima, zapatillas, recorrido…" />
      </label>

      {friends.length > 0 && <WithFriends friends={friends} initial={initial.with ?? []} />}

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" disabled={pending}>
          {pending ? "Guardando…" : initial.id ? "Guardar cambios" : "Registrar entreno"}
        </button>
        {state.error && <p className="text-sm font-medium text-critical">✕ {state.error}</p>}
        {state.message && (
          <p className="text-sm font-medium text-good-ink">
            ✓ {state.message}{" "}
            <Link href="/plan" className="underline">
              Ver plan
            </Link>
          </p>
        )}
      </div>
    </form>
  );
}

/** «¿Con quién has entrenado?»: amigos marcados (con filtro si son muchos). La sesión les aparecerá para añadirla a sus entrenos. */
function WithFriends({ friends, initial }: { friends: { id: string; name: string; username: string }[]; initial: string[] }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>(initial);
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const shown = friends.filter((f) => picked.includes(f.id) || !q || norm(`${f.name} ${f.username}`).includes(norm(q)));
  return (
    <fieldset className="space-y-2">
      <legend className="field">¿Con quién has entrenado?</legend>
      {friends.length > 6 && <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar amigo…" aria-label="Buscar amigo" />}
      <div className="flex flex-wrap gap-1.5">
        {shown.map((f) => (
          <label key={f.id} className="cursor-pointer rounded-full border border-line px-3 py-1 text-xs font-medium has-[:checked]:border-accent has-[:checked]:bg-surface-2">
            <input
              type="checkbox"
              name="with"
              value={f.id}
              checked={picked.includes(f.id)}
              onChange={(e) => setPicked((p) => (e.target.checked ? [...p, f.id] : p.filter((x) => x !== f.id)))}
              className="sr-only"
            />
            {picked.includes(f.id) ? "✓ " : "+ "}
            {f.name}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">Les aparecerá en Amigos para que la añadan a sus entrenos con un clic.</p>
    </fieldset>
  );
}
