"use client";

import { useCallback, useEffect, useRef, useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ExercisePicker } from "./ExercisePicker";
import { ExerciseThumb } from "./ExerciseMedia";
import { BodyChip, LoadSwitch, SetBadge, onlyBody } from "./RoutineEditor";
import { LIVE_WORKOUT_KEY, LIVE_WORKOUT_MAX_MS } from "@/lib/strength/liveWorkout";
import { finishWorkout } from "@/app/strength-actions";
import { withCustom } from "@/lib/strength/exerciseList";
import type { Equipment, ExerciseSummary } from "@/lib/strength/labels";
import { SET_TYPES, fmtLoad, nextTarget, platesFor, supersetLetters, type Suggestion } from "@/lib/strength/workouts";
import type { Routine, RoutineSet, SetType, WorkoutExercise, WorkoutSet } from "@/lib/types";
import { Icon } from "./icons";
import { intlLocale, translator, type Locale } from "@/lib/i18n";

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
  bw?: boolean; // con peso corporal: los kg son lastre
  sets: LiveSet[];
  hint?: Pick<Suggestion, "text" | "up">; // progresión doble respecto a la última vez
  notes?: string;
  superset?: number;
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
const STORAGE = LIVE_WORKOUT_KEY;
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
const fmtPrev = (bw: boolean | undefined, s: WorkoutSet | undefined, pc: string) => (s ? `${bw || s.kg ? `${fmtLoad(bw, s.kg, pc)} × ` : ""}${s.reps ?? "–"}` : "–");
let keySeq = 0;
const RPE_KEYS: Record<number, "rpe.suave" | "rpe.moderado" | "rpe.duro" | "rpe.muyDuro" | "rpe.maximo"> = { 3: "rpe.suave", 5: "rpe.moderado", 7: "rpe.duro", 9: "rpe.muyDuro", 10: "rpe.maximo" };

type Suggest = (exerciseId: string, plan?: RoutineSet, notes?: string) => Suggestion | undefined;

/** Series de un ejercicio con lo que toca hoy: lo de la rutina, salvo que la progresión doble proponga otra cosa. */
function liveExercise(exerciseId: string, sets: RoutineSet[], suggest: Suggest, extra: Pick<LiveExercise, "bw" | "notes" | "superset">): LiveExercise {
  const sug = suggest(exerciseId, sets.find((s) => s.type !== "calentamiento"), extra.notes);
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

function fromRoutine(routine: Routine | undefined, suggest: Suggest, name: string): Live {
  return {
    startedAt: Date.now(),
    routineId: routine?.id,
    name: routine?.name ?? name,
    exercises: (routine?.exercises ?? []).map((e) => liveExercise(e.exerciseId, e.sets, suggest, { bw: e.bw, notes: e.notes, superset: e.superset })),
  };
}

/** Entreno en vivo, como en Hevy: anterior, kg, reps y ✓ por serie, con la duración. */
export function WorkoutLogger({
  routine,
  custom,
  previous,
  available,
  bodyKg,
  pastStart,
  pastLabel,
  locale,
}: {
  routine?: Routine;
  pastStart?: string; // apuntar un entreno ya hecho: «AAAA-MM-DDTHH:MM:00» (sin cronómetro ni descansos)
  pastLabel?: string; // «martes 19 oct», para la cabecera
  custom: ExerciseSummary[];
  previous: Record<string, WorkoutExercise>;
  available?: Equipment[];
  bodyKg?: number; // peso del perfil, para los ejercicios con peso corporal
  locale: Locale;
}) {
  const router = useRouter();
  const t = translator(locale);
  const nf = intlLocale(locale);
  // el reloj repinta cada segundo: la lista y el índice se calculan una vez
  const exercises = useMemo(() => withCustom(custom), [custom]);
  const byId = useMemo(() => new Map(exercises.map((x) => [x.id, x])), [exercises]);
  const suggest: Suggest = (id, plan, notes) => nextTarget(previous[id], plan, notes, byId.get(id)?.eq ?? []);
  const [w, setW] = useState<Live>();
  const [resumed, setResumed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [picking, setPicking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  // alto de la cabecera fija, para dejarle su hueco (la cabecera aparece cuando ya se ha cargado el entreno)
  const [headH, setHeadH] = useState(0);
  const headRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const ro = new ResizeObserver(() => setHeadH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  // tras guardar, la página se vuelve a renderizar antes de irse: no hay que reabrir ni volver a guardar el entreno
  const saved = useRef(false);

  // al abrir: si había un entreno a medias, se continúa
  useEffect(() => {
    if (saved.current) return;
    // uno ya hecho: siempre desde la rutina, sin mezclarlo con un entreno en vivo a medias
    if (pastStart) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage y la hora solo existen en el navegador
      setW(fromRoutine(routine, suggest, t("wl.entreno")));
      return;
    }
    const stored = load();
    if (stored?.exercises && Date.now() - stored.startedAt < LIVE_WORKOUT_MAX_MS) {
      setW(stored);
      setResumed(stored.routineId !== routine?.id || Boolean(stored.exercises.some((e) => e.sets.some((s) => s.done))));
    } else setW(fromRoutine(routine, suggest, t("wl.entreno")));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar de rutina, no cada vez que llega el objeto
  }, [routine?.id]);
  useEffect(() => {
    if (!saved.current && !pastStart) store(w);
  }, [w, pastStart]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!w) return <div className="h-64 animate-pulse rounded-2xl bg-surface" />;

  // siempre sobre el estado más reciente: varios toques seguidos no se pisan
  const edit = (fn: (cur: Live) => Live) => setW((cur) => cur && fn(cur));
  const update = (key: number, fn: (e: LiveExercise) => LiveExercise) => edit((cur) => ({ ...cur, exercises: cur.exercises.map((e) => (e.key === key ? fn(e) : e)) }));
  const done = w.exercises.flatMap((e) => e.sets.filter((s) => s.done && s.type !== "calentamiento").map((s) => ({ e, s })));
  const doneSets = done.map((d) => d.s);
  const volume = Math.round(done.reduce((t, { e, s }) => t + ((e.bw ? (bodyKg ?? 0) : 0) + (num(s.kg) ?? 0)) * (num(s.reps) ?? 0), 0));
  const paused = Boolean(w.pausedAt);
  const letters = supersetLetters(w.exercises);
  const elapsed = Math.max(0, Math.floor(((w.pausedAt ?? now) - w.startedAt - (w.pausedMs ?? 0)) / 1000));
  const togglePause = () => {
    edit((cur) => (cur.pausedAt ? { ...cur, pausedMs: (cur.pausedMs ?? 0) + Date.now() - cur.pausedAt, pausedAt: undefined } : { ...cur, pausedAt: Date.now() }));
  };

  const markAll = () =>
    edit((cur) => ({
      ...cur,
      exercises: cur.exercises.map((e) => {
        const prev = previous[e.exerciseId]?.sets ?? [];
        return {
          ...e,
          sets: e.sets.map((x, j) => {
            if (x.done) return x;
            const warm = x.type === "calentamiento";
            const p = prev.filter((y) => (y.type === "calentamiento") === warm)[e.sets.slice(0, j).filter((y) => (y.type === "calentamiento") === warm).length];
            const kg = x.kg || ((x.target?.kg ?? p?.kg)?.toString() ?? "");
            const reps = x.reps || ((x.target?.reps ?? p?.reps)?.toString() ?? "");
            return { ...x, done: true, kg, reps };
          }),
        };
      }),
    }));

  const restart = () => {
    setW(fromRoutine(routine, suggest, t("wl.entreno")));
    setResumed(false);
  };
  const discard = () => {
    if (!confirm(t("wl.descartarConfirm"))) return;
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
        startLocal: pastStart ?? localIso(w.startedAt),
        durationSec: pastStart ? Math.round((Number(fd.get("minutes")) || 0) * 60) : elapsed,
        rpe: Number(fd.get("rpe")) || undefined,
        feelings: String(fd.get("feelings") ?? ""),
        workout: {
          routineId: w.routineId,
          exercises: w.exercises.map((e) => ({ exerciseId: e.exerciseId, bw: e.bw, notes: e.notes, sets: e.sets.map((s) => ({ type: s.type, kg: s.kg, reps: s.reps, done: s.done })) })),
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
      <div ref={headRef} className="vv-top fixed inset-x-0 top-[calc(3.5rem+1px+env(safe-area-inset-top))] z-30 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur md:sticky md:inset-x-auto md:top-0 md:-mx-8 md:px-8">
        <div className="flex items-center justify-between gap-2">
          {/* con borde, a juego con «Terminar»; rojo solo al pasar o pulsar */}
          <button type="button" className="shrink-0 rounded-full border border-line px-4 py-1.5 text-sm font-semibold text-ink-2 transition hover:border-critical hover:text-critical active:border-critical active:text-critical" onClick={discard}>
            {t("wl.descartar")}
          </button>
          <strong className="truncate">{w.name}</strong>
          <button type="button" className="btn px-4 py-1.5" onClick={() => setFinishing(true)}>
            {t("wl.terminar")}
          </button>
        </div>
        {pastStart ? (
          <div className="mt-2 flex items-center justify-between gap-2 text-sm">
            <span className="text-ink-2">
              {t("wl.entrenoDel", { fecha: pastLabel ?? pastStart.slice(0, 10), series: doneSets.length, kg: volume.toLocaleString(nf) })}
            </span>
            <button type="button" className="shrink-0 text-xs font-semibold text-accent" onClick={markAll}>
              {t("wl.marcarTodas")}
            </button>
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-4 items-center text-center">
            {/* solo el icono: con el texto ocupaba media fila */}
            <button
              type="button"
              onClick={togglePause}
              className={`mx-auto grid h-9 w-9 place-items-center rounded-full ${paused ? "bg-accent text-accent-ink" : "bg-surface-2"}`}
              aria-pressed={paused}
              aria-label={paused ? t("wl.reanudar") : t("wl.pausa")}
              title={paused ? t("wl.reanudar") : t("wl.pausa")}
            >
              <Icon name={paused ? "play" : "pause"} className="h-4 w-4" />
            </button>
            <Metric label={paused ? t("wl.enPausa") : t("wl.duracion")} value={fmtClock(elapsed)} accent />
            <Metric label={t("wl.volumen")} value={`${volume.toLocaleString(nf)} kg`} />
            <Metric label={t("wl.series")} value={String(doneSets.length)} />
          </div>
        )}
      </div>
      {/* en el móvil la cabecera va fija bajo la barra de arriba, como ella (con sticky se iba al desplazar en el iPhone); este hueco ocupa su sitio (sube lo que ya deja libre la página bajo la barra) */}
      <div aria-hidden className="-mt-4 md:hidden" style={{ height: headH }} />

      {resumed && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3 text-sm">
          <span>{t("wl.continuas", { nombre: w.name })}</span>
          <button type="button" className="text-xs text-muted underline" onClick={() => confirm(t("wl.empezarNuevoConfirm")) && restart()}>
            {t("wl.empezarNuevo")}
          </button>
        </div>
      )}

      {w.exercises.map((e, i) => {
        const x = byId.get(e.exerciseId);
        const letter = letters[i];
        // en superserie se pasa al siguiente ejercicio de la ronda; se descansa al acabarla
        const restAfter = !e.superset || w.exercises[i + 1]?.superset !== e.superset;
        const last = previous[e.exerciseId];
        const prev = last?.sets ?? [];
        // con barra, los discos por lado de la próxima serie (barra olímpica de 20 kg)
        const next = !e.bw && x?.eq.includes("barra") ? e.sets.find((s) => !s.done) : undefined;
        const nextKg = next ? (num(next.kg) ?? next.target?.kg) : undefined;
        const plates = nextKg && nextKg > 20 ? platesFor(nextKg) : undefined;
        return (
          <section key={e.key} className={`rounded-2xl border bg-surface p-3 ${letter ? "border-accent" : "border-line"}`}>
            {letter && (
              <p className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                <Icon name="link" className="h-3.5 w-3.5" /> {t("rut.superserie", { letra: letter })}
                {!restAfter && <span className="font-normal text-muted"> {t("wl.sinDescanso")}</span>}
              </p>
            )}
            <div className="flex items-center gap-3">
              {x && <ExerciseThumb x={x} className="h-11 w-11" />}
              <a href={`/fuerza/ejercicios/${e.exerciseId}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-semibold text-accent">
                {x?.name ?? e.exerciseId}
              </a>
              <button
                type="button"
                className="px-1 text-muted hover:text-critical"
                onClick={() => confirm(t("wl.quitarConfirm", { nombre: x?.name ?? t("wl.elEjercicio") })) && edit((cur) => ({ ...cur, exercises: cur.exercises.filter((y) => y.key !== e.key) }))}
                aria-label={t("wl.quitarEjercicio")}
              >
                ✕
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <LoadSwitch locale={locale} bw={Boolean(e.bw)} onChange={(bw) => update(e.key, (y) => ({ ...y, bw }))} />
            </div>
            <input
              className="input mt-2 py-1.5 text-sm"
              placeholder={t("wl.notaPh")}
              value={e.notes ?? ""}
              onChange={(ev) => update(e.key, (y) => ({ ...y, notes: ev.target.value }))}
              maxLength={200}
              aria-label={t("wl.notaAria")}
            />
            {e.hint && <p className={`mt-2 text-xs ${e.hint.up ? "font-semibold text-accent" : "text-ink-2"}`}>{e.hint.up ? "↑ " : ""}{e.hint.text}</p>}
            {plates && (
              <p className="mt-1 text-xs text-ink-2">
                {t("wl.discos", { kg: fmtLoad(false, nextKg), discos: plates.side.map((p) => p.toLocaleString(nf)).join(" + ") })}
                {plates.left > 0 && ` ${t("wl.sinDisco", { kg: plates.left.toLocaleString(nf) })}`} {t("wl.barra20")}
              </p>
            )}
            {e.bw && !bodyKg && <p className="mt-1 text-xs text-muted">{t("wl.ponPeso")}</p>}
            <table className="mt-2 w-full table-fixed text-sm">
              <thead>
                <tr className="text-[11px] text-muted">
                  <th className="w-11 py-1 text-left font-medium">{t("tab.serie")}</th>
                  <th className="py-1 text-left font-medium">{t("tab.anterior")}</th>
                  {e.bw && <th className="w-12 py-1 font-medium">{t("tab.peso")}</th>}
                  <th className={`${e.bw ? "w-[3.75rem]" : "w-[4.5rem]"} py-1 font-medium`}>{e.bw ? t("tab.lastre") : t("tab.kg")}</th>
                  <th className="w-[3.75rem] py-1 font-medium">{t("tab.reps")}</th>
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
                  };
                  return (
                    <tr key={j} className={s.done ? "bg-good/15" : j % 2 ? "bg-surface-2" : ""}>
                      <td className="py-1">
                        <SetBadge locale={locale} type={s.type} n={n} onClick={() => setRow({ type: SET_TYPES[(SET_TYPES.indexOf(s.type) + 1) % SET_TYPES.length] })} />
                      </td>
                      <td className="truncate py-1 text-xs text-muted">{fmtPrev(last?.bw, p, t("re.pc"))}</td>
                      {e.bw && (
                        <td className="px-0.5 py-1">
                          <BodyChip locale={locale} kg={bodyKg} />
                        </td>
                      )}
                      <td className="px-0.5 py-1">
                        <input className="input px-1 py-1.5 text-center" inputMode="decimal" placeholder={kgHint?.toString() ?? (e.bw ? "+0" : "–")} value={s.kg} onChange={(ev) => setRow({ kg: ev.target.value })} aria-label={t(e.bw ? "wl.lastreSerie" : "wl.kgSerie", { n: j + 1 })} />
                      </td>
                      <td className="px-0.5 py-1">
                        <input className="input px-1 py-1.5 text-center" inputMode="numeric" placeholder={repsHint?.toString() ?? "–"} value={s.reps} onChange={(ev) => setRow({ reps: ev.target.value })} aria-label={t("wl.repsSerie", { n: j + 1 })} />
                      </td>
                      <td className="py-1 text-center">
                        {/* el toque no quita el foco del campo: si el teclado se cerraba antes del clic, la página
                            bajaba y el toque caía en el ✓ de la serie de arriba (y la desmarcaba) */}
                        <button
                          type="button"
                          onPointerDown={(ev) => ev.preventDefault()}
                          onClick={() => {
                            check();
                            (document.activeElement as HTMLElement | null)?.blur();
                          }}
                          className={`h-10 w-10 touch-manipulation rounded-lg text-base font-bold ${s.done ? "bg-good text-white" : "bg-surface-2 text-muted"}`}
                          aria-pressed={s.done}
                          aria-label={t("wl.serieHecha", { n: j + 1 })}
                        >
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
                {t("wl.anadirSerie")}
              </button>
              {e.sets.length > 1 && (
                <button type="button" className="btn btn-ghost py-1.5 text-sm" onClick={() => update(e.key, (y) => ({ ...y, sets: y.sets.slice(0, -1) }))} aria-label={t("wl.quitarUltima")}>
                  {t("wl.menosSerie")}
                </button>
              )}
            </div>
          </section>
        );
      })}

      <button type="button" className="btn w-full" onClick={() => setPicking(true)}>
        {t("wl.anadirEjercicio")}
      </button>
      <p className="text-center text-xs text-muted">
        {t("wl.ayuda", { c: t("set.c"), d: t("set.d"), f: t("set.f") })}
      </p>

      {picking && (
        <ExercisePicker
          locale={locale}
          exercises={exercises}
          available={available}
          onClose={() => setPicking(false)}
          onAdd={(ids) => {
            edit((cur) => ({
              ...cur,
              exercises: [...cur.exercises, ...ids.map((exerciseId) => liveExercise(exerciseId, [{}, {}, {}], suggest, { bw: onlyBody(byId.get(exerciseId)) }))],
            }));
            setPicking(false);
          }}
        />
      )}

      {finishing && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center" role="dialog" aria-modal aria-label={t("wl.terminarEntreno")}>
          <form action={finish} className="w-full space-y-3 rounded-t-2xl bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:max-w-md md:rounded-2xl">
            <strong className="block text-lg">{t("wl.terminarEntreno")}</strong>
            <p className="text-sm text-ink-2">
              {t("wl.resumen", { tiempo: (pastStart ? pastLabel : fmtClock(elapsed)) ?? "", series: doneSets.length, kg: volume.toLocaleString(nf) })}
            </p>
            <label className="field">
              {t("wl.nombre")}
              <input className="input" name="name" defaultValue={w.name} maxLength={80} />
            </label>
            {pastStart && (
              <label className="field">
                {t("wl.duracionMin")}
                <input className="input" name="minutes" type="number" inputMode="numeric" min={1} max={360} required defaultValue={Math.max(20, Math.round(doneSets.length * 2.5 + 5))} />
              </label>
            )}
            <label className="field">
              {t("wl.rpe")}
              <select className="input" name="rpe" defaultValue="7">
                <option value="">{t("wl.sinIndicar")}</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                    {RPE_KEYS[n] ? ` · ${t(RPE_KEYS[n])}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              {t("wl.comoTeSentiste")}
              <textarea className="input min-h-16" name="feelings" maxLength={1000} placeholder={t("wl.sentiPh")} />
            </label>
            {error && <p className="text-sm font-medium text-critical">✕ {error}</p>}
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost flex-1" onClick={() => setFinishing(false)}>
                {t("wl.seguir")}
              </button>
              <button className="btn flex-1" disabled={pending}>
                {pending ? t("wl.guardando") : t("wl.guardarEntreno")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// la duración, en grande y lima; volumen y series, más pequeños
function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className={`tabular ${accent ? "font-display text-3xl leading-none text-accent" : "font-semibold"}`}>{value}</div>
      <div className="mt-0.5 text-[10px] font-semibold tracking-wider text-muted uppercase">{label}</div>
    </div>
  );
}
