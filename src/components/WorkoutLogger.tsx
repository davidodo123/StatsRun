"use client";

import { useEffect, useRef, useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ExercisePicker } from "./ExercisePicker";
import { ExerciseThumb } from "./ExerciseMedia";
import { BodyChip, LoadSwitch, RestChip, SetBadge, onlyBody } from "./RoutineEditor";
import { finishWorkout } from "@/app/strength-actions";
import { withCustom } from "@/lib/strength/exerciseList";
import type { Equipment, ExerciseSummary } from "@/lib/strength/labels";
import { SET_TYPES, SET_TYPE_SHORT, fmtLoad, nextTarget, type Suggestion } from "@/lib/strength/workouts";
import type { Routine, RoutineSet, SetType, WorkoutExercise, WorkoutSet } from "@/lib/types";
import { Icon } from "./icons";

interface LiveSet {
  type: SetType;
  kg: string;
  reps: string;
  done: boolean;
  target?: { kg?: number; reps?: number }; // lo que pone la rutina
}
interface LiveExercise {
  key: number;
  exerciseId: string;
  restSec: number;
  bw?: boolean; // con peso corporal: los kg son lastre
  sets: LiveSet[];
  hint?: Pick<Suggestion, "text" | "up">; // progresión doble respecto a la última vez
}
interface Live {
  startedAt: number; // epoch ms
  pausedMs?: number; // tiempo total en pausa
  pausedAt?: number; // si está en pausa, desde cuándo
  routineId?: string;
  name: string;
  exercises: LiveExercise[];
}

// el entreno en curso se guarda en el navegador: si se cierra la app o se bloquea el móvil, sigue donde estaba
const STORAGE = "rio-entreno";
const load = (): Live | undefined => {
  try {
    const raw = localStorage.getItem(STORAGE);
    return raw ? (JSON.parse(raw) as Live) : undefined;
  } catch {
    return undefined;
  }
};
const store = (w: Live | undefined) => {
  try {
    if (w) localStorage.setItem(STORAGE, JSON.stringify(w));
    else localStorage.removeItem(STORAGE);
  } catch {}
};

const fmtClock = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
};
const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return v.trim() && Number.isFinite(n) ? n : undefined;
};
const localIso = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
const fmtPrev = (bw: boolean | undefined, s?: WorkoutSet) => (s ? `${bw || s.kg ? `${fmtLoad(bw, s.kg)} × ` : ""}${s.reps ?? "–"}` : "–");
let keySeq = 0;

type Suggest = (exerciseId: string, plan?: RoutineSet, notes?: string) => Suggestion | undefined;

/** Series de un ejercicio con lo que toca hoy: lo de la rutina, salvo que la progresión doble proponga otra cosa. */
function liveExercise(exerciseId: string, sets: RoutineSet[], suggest: Suggest, extra: Pick<LiveExercise, "restSec" | "bw">, notes?: string): LiveExercise {
  const sug = suggest(exerciseId, sets.find((s) => s.type !== "calentamiento"), notes);
  return {
    key: keySeq++,
    exerciseId,
    ...extra,
    ...(sug ? { hint: { text: sug.text, up: sug.up } } : {}),
    sets: sets.map((s) => {
      const warm = s.type === "calentamiento";
      return { type: s.type ?? "normal", kg: "", reps: "", done: false, target: sug && !warm ? { kg: sug.kg ?? s.kg, reps: sug.reps } : { kg: s.kg, reps: s.reps } };
    }),
  };
}

function fromRoutine(routine: Routine | undefined, suggest: Suggest): Live {
  return {
    startedAt: Date.now(),
    routineId: routine?.id,
    name: routine?.name ?? "Entreno",
    exercises: (routine?.exercises ?? []).map((e) => liveExercise(e.exerciseId, e.sets, suggest, { restSec: e.restSec ?? 90, bw: e.bw }, e.notes)),
  };
}

/** Entreno en vivo, como en Hevy: anterior, kg, reps y ✓ por serie, con descanso y duración. */
export function WorkoutLogger({
  routine,
  custom,
  previous,
  available,
  bodyKg,
}: {
  routine?: Routine;
  custom: ExerciseSummary[];
  previous: Record<string, WorkoutExercise>;
  available?: Equipment[];
  bodyKg?: number; // peso del perfil, para los ejercicios con peso corporal
}) {
  const router = useRouter();
  // el reloj repinta cada segundo: la lista y el índice se calculan una vez
  const exercises = useMemo(() => withCustom(custom), [custom]);
  const byId = useMemo(() => new Map(exercises.map((x) => [x.id, x])), [exercises]);
  const suggest: Suggest = (id, plan, notes) => nextTarget(previous[id], plan, notes, byId.get(id)?.eq ?? []);
  const [w, setW] = useState<Live>();
  const [resumed, setResumed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [rest, setRest] = useState<{ until: number; total: number }>();
  const [picking, setPicking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  // tras guardar, la página se vuelve a renderizar antes de irse: no hay que reabrir ni volver a guardar el entreno
  const saved = useRef(false);

  // al abrir: si había un entreno a medias, se continúa
  useEffect(() => {
    if (saved.current) return;
    const stored = load();
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage solo existe en el navegador */
    if (stored?.exercises && Date.now() - stored.startedAt < 12 * 3600_000) {
      setW(stored);
      setResumed(stored.routineId !== routine?.id || Boolean(stored.exercises.some((e) => e.sets.some((s) => s.done))));
    } else setW(fromRoutine(routine, suggest));
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar de rutina, no cada vez que llega el objeto
  }, [routine?.id]);
  useEffect(() => {
    if (!saved.current) store(w);
  }, [w]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  // aviso al acabar el descanso
  const restLeft = rest ? Math.ceil((rest.until - now) / 1000) : 0;
  useEffect(() => {
    if (rest && restLeft <= 0) {
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {}
      // eslint-disable-next-line react-hooks/set-state-in-effect -- el descanso acaba por tiempo
      setRest(undefined);
    }
  }, [rest, restLeft]);

  if (!w) return <div className="h-64 animate-pulse rounded-2xl bg-surface" />;

  // siempre sobre el estado más reciente: varios toques seguidos no se pisan
  const edit = (fn: (cur: Live) => Live) => setW((cur) => cur && fn(cur));
  const update = (key: number, fn: (e: LiveExercise) => LiveExercise) => edit((cur) => ({ ...cur, exercises: cur.exercises.map((e) => (e.key === key ? fn(e) : e)) }));
  const done = w.exercises.flatMap((e) => e.sets.filter((s) => s.done && s.type !== "calentamiento").map((s) => ({ e, s })));
  const doneSets = done.map((d) => d.s);
  const volume = Math.round(done.reduce((t, { e, s }) => t + ((e.bw ? (bodyKg ?? 0) : 0) + (num(s.kg) ?? 0)) * (num(s.reps) ?? 0), 0));
  const paused = Boolean(w.pausedAt);
  const elapsed = Math.max(0, Math.floor(((w.pausedAt ?? now) - w.startedAt - (w.pausedMs ?? 0)) / 1000));
  const togglePause = () => {
    setRest(undefined);
    edit((cur) => (cur.pausedAt ? { ...cur, pausedMs: (cur.pausedMs ?? 0) + Date.now() - cur.pausedAt, pausedAt: undefined } : { ...cur, pausedAt: Date.now() }));
  };

  const restart = () => {
    setW(fromRoutine(routine, suggest));
    setResumed(false);
    setRest(undefined);
  };
  const discard = () => {
    if (!confirm("¿Descartar este entreno? Se perderá lo apuntado.")) return;
    store(undefined);
    router.push("/fuerza");
  };
  const finish = (fd: FormData) =>
    start(async () => {
      // se borra antes de guardar porque la acción redirige; si falla, se vuelve a guardar
      saved.current = true;
      store(undefined);
      const res = await finishWorkout({
        name: String(fd.get("name") ?? ""),
        startLocal: localIso(w.startedAt),
        durationSec: elapsed,
        rpe: Number(fd.get("rpe")) || undefined,
        feelings: String(fd.get("feelings") ?? ""),
        workout: {
          routineId: w.routineId,
          exercises: w.exercises.map((e) => ({ exerciseId: e.exerciseId, bw: e.bw, sets: e.sets.map((s) => ({ type: s.type, kg: s.kg, reps: s.reps, done: s.done })) })),
        },
      });
      // si se guardó, la acción redirige y no vuelve aquí
      if (res?.error) {
        saved.current = false;
        store(w);
        setError(res.error);
      }
    });

  return (
    <div className="space-y-4 pb-20">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 md:top-0 -mx-4 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="text-sm text-critical" onClick={discard}>
            Descartar
          </button>
          <strong className="truncate">{w.name}</strong>
          <button type="button" className="btn px-4 py-1.5" onClick={() => setFinishing(true)}>
            Terminar
          </button>
        </div>
        <div className="mt-2 grid grid-cols-4 items-center text-center">
          <button type="button" onClick={togglePause} className={`mx-auto rounded-full px-3 py-1.5 text-sm font-semibold ${paused ? "bg-accent text-accent-ink" : "bg-surface-2"}`} aria-pressed={paused}>
            <Icon name={paused ? "play" : "pause"} className="mr-1 h-3.5 w-3.5 align-[-2px]" />
            {paused ? "Reanudar" : "Pausa"}
          </button>
          <Metric label={paused ? "En pausa" : "Duración"} value={fmtClock(elapsed)} accent />
          <Metric label="Volumen" value={`${volume.toLocaleString("es-ES")} kg`} />
          <Metric label="Series" value={String(doneSets.length)} />
        </div>
      </div>

      {resumed && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3 text-sm">
          <span>Continúas el entreno «{w.name}» que dejaste a medias.</span>
          <button type="button" className="text-xs text-muted underline" onClick={() => confirm("¿Empezar de nuevo? Se perderá lo apuntado.") && restart()}>
            Empezar de nuevo
          </button>
        </div>
      )}

      {w.exercises.map((e) => {
        const x = byId.get(e.exerciseId);
        const last = previous[e.exerciseId];
        const prev = last?.sets ?? [];
        return (
          <section key={e.key} className="rounded-2xl border border-line bg-surface p-3">
            <div className="flex items-center gap-3">
              {x && <ExerciseThumb x={x} className="h-11 w-11" />}
              <a href={`/fuerza/ejercicios/${e.exerciseId}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-semibold text-accent">
                {x?.name ?? e.exerciseId}
              </a>
              <button
                type="button"
                className="px-1 text-muted hover:text-critical"
                onClick={() => confirm(`¿Quitar ${x?.name ?? "el ejercicio"} de este entreno?`) && edit((cur) => ({ ...cur, exercises: cur.exercises.filter((y) => y.key !== e.key) }))}
                aria-label="Quitar ejercicio"
              >
                ✕
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <RestChip value={e.restSec} onChange={(restSec) => update(e.key, (y) => ({ ...y, restSec }))} />
              <LoadSwitch bw={Boolean(e.bw)} onChange={(bw) => update(e.key, (y) => ({ ...y, bw }))} />
            </div>
            {e.hint && <p className={`mt-2 text-xs ${e.hint.up ? "font-semibold text-accent" : "text-ink-2"}`}>{e.hint.up ? "↑ " : ""}{e.hint.text}</p>}
            {e.bw && !bodyKg && <p className="mt-1 text-xs text-muted">Pon tu peso en Perfil para contar el peso corporal en el volumen.</p>}
            <table className="mt-2 w-full table-fixed text-sm">
              <thead>
                <tr className="text-[11px] text-muted">
                  <th className="w-11 py-1 text-left font-medium">SERIE</th>
                  <th className="py-1 text-left font-medium">ANTERIOR</th>
                  {e.bw && <th className="w-12 py-1 font-medium">PESO</th>}
                  <th className={`${e.bw ? "w-[3.75rem]" : "w-[4.5rem]"} py-1 font-medium`}>{e.bw ? "LASTRE" : "KG"}</th>
                  <th className="w-[3.75rem] py-1 font-medium">REPS</th>
                  <th className="w-10 py-1 font-medium">✓</th>
                </tr>
              </thead>
              <tbody>
                {e.sets.map((s, j) => {
                  const n = e.sets.slice(0, j + 1).filter((y) => y.type !== "calentamiento").length;
                  // «anterior» de la misma clase: calentamiento con calentamiento y efectiva con efectiva
                  const warm = s.type === "calentamiento";
                  const p = prev.filter((y) => (y.type === "calentamiento") === warm)[e.sets.slice(0, j).filter((y) => (y.type === "calentamiento") === warm).length];
                  const kgHint = s.target?.kg ?? p?.kg;
                  const repsHint = s.target?.reps ?? p?.reps;
                  const setRow = (patch: Partial<LiveSet>) => update(e.key, (y) => ({ ...y, sets: y.sets.map((r, k) => (k === j ? { ...r, ...patch } : r)) }));
                  const check = () => {
                    if (s.done) return setRow({ done: false });
                    // sin escribir nada, vale lo que se ve en gris (rutina o última vez)
                    setRow({ done: true, kg: s.kg || (kgHint?.toString() ?? ""), reps: s.reps || (repsHint?.toString() ?? "") });
                    if (e.restSec && s.type !== "calentamiento") setRest({ until: Date.now() + e.restSec * 1000, total: e.restSec });
                  };
                  return (
                    <tr key={j} className={s.done ? "bg-good/15" : j % 2 ? "bg-surface-2" : ""}>
                      <td className="py-1">
                        <SetBadge type={s.type} n={n} onClick={() => setRow({ type: SET_TYPES[(SET_TYPES.indexOf(s.type) + 1) % SET_TYPES.length] })} />
                      </td>
                      <td className="truncate py-1 text-xs text-muted">{fmtPrev(last?.bw, p)}</td>
                      {e.bw && (
                        <td className="px-0.5 py-1">
                          <BodyChip kg={bodyKg} />
                        </td>
                      )}
                      <td className="px-0.5 py-1">
                        <input className="input px-1 py-1.5 text-center" inputMode="decimal" placeholder={kgHint?.toString() ?? (e.bw ? "+0" : "–")} value={s.kg} onChange={(ev) => setRow({ kg: ev.target.value })} aria-label={`${e.bw ? "Lastre" : "Kg"} serie ${j + 1}`} />
                      </td>
                      <td className="px-0.5 py-1">
                        <input className="input px-1 py-1.5 text-center" inputMode="numeric" placeholder={repsHint?.toString() ?? "–"} value={s.reps} onChange={(ev) => setRow({ reps: ev.target.value })} aria-label={`Repeticiones serie ${j + 1}`} />
                      </td>
                      <td className="py-1 text-center">
                        <button type="button" onClick={check} className={`h-8 w-8 rounded-lg text-base font-bold ${s.done ? "bg-good text-white" : "bg-surface-2 text-muted"}`} aria-pressed={s.done} aria-label={`Serie ${j + 1} hecha`}>
                          ✓
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="btn btn-ghost flex-1 py-1.5 text-sm"
                onClick={() => update(e.key, (y) => ({ ...y, sets: [...y.sets, { type: "normal", kg: y.sets.at(-1)?.kg ?? "", reps: y.sets.at(-1)?.reps ?? "", done: false, target: y.sets.at(-1)?.target }] }))}
              >
                + Añadir serie
              </button>
              {e.sets.length > 1 && (
                <button type="button" className="btn btn-ghost py-1.5 text-sm" onClick={() => update(e.key, (y) => ({ ...y, sets: y.sets.slice(0, -1) }))} aria-label="Quitar la última serie">
                  − Serie
                </button>
              )}
            </div>
          </section>
        );
      })}

      <button type="button" className="btn w-full" onClick={() => setPicking(true)}>
        + Añadir ejercicio
      </button>
      <p className="text-center text-xs text-muted">
        En gris, lo que toca hoy (la rutina con la progresión doble, o la última vez): si no escribes nada, al marcar ✓ se apunta eso. Toca el número de serie para marcarla como {SET_TYPE_SHORT.calentamiento} (calentamiento), {SET_TYPE_SHORT.descendente} o {SET_TYPE_SHORT.fallo}.
      </p>

      {rest && restLeft > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 px-4 md:bottom-4 md:left-56">
          <div className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-lg">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted">Descanso</div>
              <div className="tabular text-2xl font-bold">{fmtClock(restLeft)}</div>
              <div className="mt-1 h-1 overflow-hidden rounded bg-surface-2">
                <div className="h-full bg-accent" style={{ width: `${(restLeft / rest.total) * 100}%` }} />
              </div>
            </div>
            <button type="button" className="btn btn-ghost px-3" onClick={() => setRest({ ...rest, until: rest.until - 15_000 })}>
              −15
            </button>
            <button type="button" className="btn btn-ghost px-3" onClick={() => setRest({ until: rest.until + 15_000, total: rest.total + 15 })}>
              +15
            </button>
            <button type="button" className="btn px-3" onClick={() => setRest(undefined)}>
              Saltar
            </button>
          </div>
        </div>
      )}

      {picking && (
        <ExercisePicker
          exercises={exercises}
          available={available}
          onClose={() => setPicking(false)}
          onAdd={(ids) => {
            edit((cur) => ({
              ...cur,
              exercises: [...cur.exercises, ...ids.map((exerciseId) => liveExercise(exerciseId, [{}, {}, {}], suggest, { restSec: 90, bw: onlyBody(byId.get(exerciseId)) }))],
            }));
            setPicking(false);
          }}
        />
      )}

      {finishing && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center" role="dialog" aria-modal aria-label="Terminar entreno">
          <form action={finish} className="w-full space-y-3 rounded-t-2xl bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:max-w-md md:rounded-2xl">
            <strong className="block text-lg">Terminar entreno</strong>
            <p className="text-sm text-ink-2">
              {fmtClock(elapsed)} · {doneSets.length} series · {volume.toLocaleString("es-ES")} kg
            </p>
            <label className="field">
              Nombre
              <input className="input" name="name" defaultValue={w.name} maxLength={80} />
            </label>
            <label className="field">
              Esfuerzo de la sesión (RPE 1-10)
              <select className="input" name="rpe" defaultValue="7">
                <option value="">Sin indicar</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                    {n === 3 ? " · suave" : n === 5 ? " · moderado" : n === 7 ? " · duro" : n === 9 ? " · muy duro" : n === 10 ? " · máximo" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              ¿Cómo te has sentido? (opcional)
              <textarea className="input min-h-16" name="feelings" maxLength={1000} placeholder="Agujetas, molestias, energía…" />
            </label>
            {error && <p className="text-sm font-medium text-critical">✕ {error}</p>}
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost flex-1" onClick={() => setFinishing(false)}>
                Seguir
              </button>
              <button className="btn flex-1" disabled={pending}>
                {pending ? "Guardando…" : "Guardar entreno"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-muted">{label}</div>
      <div className={`tabular font-semibold ${accent ? "text-accent" : ""}`}>{value}</div>
    </div>
  );
}
