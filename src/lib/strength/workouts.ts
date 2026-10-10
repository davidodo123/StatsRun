// Rutinas y entrenos de fuerza: validación de lo que llega del navegador, volumen, historial y «anterior».
import type { Equipment } from "./labels";
import type { Activity, RoutineExercise, RoutineSet, SetType, Workout, WorkoutExercise, WorkoutSet } from "../types";

export const SET_TYPES: SetType[] = ["normal", "calentamiento", "descendente", "fallo"];
export const SET_TYPE_SHORT: Record<SetType, string> = { normal: "", calentamiento: "C", descendente: "D", fallo: "F" };
export const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];
export const restLabel = (s: number) => (!s ? "Sin descanso" : s < 60 ? `${s} s` : s % 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} min` : `${s / 60} min`);

const MAX_EXERCISES = 30;
const MAX_SETS = 20;

const numIn = (v: unknown, min: number, max: number, step = 0.25): number | undefined => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  if (v === "" || v === null || v === undefined || !Number.isFinite(n) || n < min || n > max) return undefined;
  return Math.round(n / step) * step;
};

function cleanSet(raw: unknown): WorkoutSet {
  const s = (raw ?? {}) as Record<string, unknown>;
  const type = SET_TYPES.includes(s.type as SetType) && s.type !== "normal" ? (s.type as SetType) : undefined;
  const out: WorkoutSet = {};
  if (type) out.type = type;
  const kg = numIn(s.kg, 0, 1000);
  const reps = numIn(s.reps, 0, 1000, 1);
  const rir = numIn(s.rir, 0, 10, 1);
  if (kg !== undefined) out.kg = kg;
  if (reps !== undefined) out.reps = reps;
  if (rir !== undefined) out.rir = rir;
  return out;
}

/** Ejercicios de una rutina tal como llegan del editor, limpios y acotados. */
export function cleanRoutineExercises(raw: unknown, exists: (id: string) => boolean): RoutineExercise[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, MAX_EXERCISES)
    .map((r) => (r ?? {}) as Record<string, unknown>)
    .filter((r) => typeof r.exerciseId === "string" && exists(r.exerciseId))
    .map((r) => {
      const ex: RoutineExercise = {
        exerciseId: r.exerciseId as string,
        sets: (Array.isArray(r.sets) ? r.sets : [{}]).slice(0, MAX_SETS).map((s) => {
          const set: RoutineSet = cleanSet(s);
          delete (set as WorkoutSet).rir;
          return set;
        }),
      };
      if (r.bw === true) ex.bw = true;
      const rest = numIn(r.restSec, 0, 600, 5);
      if (rest !== undefined) ex.restSec = rest;
      if (typeof r.notes === "string" && r.notes.trim()) ex.notes = r.notes.trim().slice(0, 200);
      if (!ex.sets.length) ex.sets.push({});
      return ex;
    });
}

/** Entreno terminado: solo las series marcadas como hechas (aunque no lleven kg ni repeticiones, p. ej. sin peso). */
export function cleanWorkout(raw: unknown, nameOf: (id: string) => string | undefined, bodyKg?: number): Workout {
  const w = (raw ?? {}) as Record<string, unknown>;
  const exercises: WorkoutExercise[] = (Array.isArray(w.exercises) ? w.exercises : [])
    .slice(0, MAX_EXERCISES)
    .map((r) => (r ?? {}) as Record<string, unknown>)
    .flatMap((r) => {
      const name = typeof r.exerciseId === "string" ? nameOf(r.exerciseId) : undefined;
      if (!name) return [];
      const sets = (Array.isArray(r.sets) ? r.sets : [])
        .slice(0, MAX_SETS)
        .filter((s) => (s as Record<string, unknown>)?.done)
        .map(cleanSet);
      if (!sets.length) return [];
      const ex: WorkoutExercise = { exerciseId: r.exerciseId as string, name, sets };
      if (r.bw === true) {
        ex.bw = true;
        if (bodyKg) ex.bodyKg = bodyKg;
      }
      if (typeof r.notes === "string" && r.notes.trim()) ex.notes = r.notes.trim().slice(0, 200);
      return [ex];
    });
  return { ...(typeof w.routineId === "string" && w.routineId ? { routineId: w.routineId } : {}), exercises };
}

const working = (s: WorkoutSet) => s.type !== "calentamiento";

/** Carga de una serie: con peso corporal, el peso del perfil más el lastre. */
export const setLoad = (e: Pick<WorkoutExercise, "bw" | "bodyKg">, s: WorkoutSet) => (e.bw ? (e.bodyKg ?? 0) : 0) + (s.kg ?? 0);

const fmtNum = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });

/** Texto de la carga: «PC», «PC + 10 kg» o «80 kg». */
export const fmtLoad = (bw: boolean | undefined, kg?: number) => (bw ? (kg ? `PC + ${fmtNum(kg)} kg` : "PC") : kg !== undefined ? `${fmtNum(kg)} kg` : "–");

/** Kilos totales movidos (series efectivas: sin calentamiento). */
export const workoutVolume = (w: Workout) => Math.round(w.exercises.reduce((t, e) => t + e.sets.filter(working).reduce((s, x) => s + setLoad(e, x) * (x.reps ?? 0), 0), 0));
export const workoutReps = (w: Workout) => w.exercises.reduce((t, e) => t + e.sets.filter(working).reduce((s, x) => s + (x.reps ?? 0), 0), 0);
export const workoutSets = (w: Workout) => w.exercises.reduce((t, e) => t + e.sets.filter(working).length, 0);

/** 1RM estimado (Epley) de una serie; solo con 1-12 repeticiones, donde la fórmula es fiable. */
export const estimate1RM = (kg?: number, reps?: number) => (kg && reps && reps <= 12 ? Math.round(kg * (1 + (reps - 1) / 30) * 10) / 10 : undefined);

const withWorkout = (acts: Activity[]) => acts.filter((a): a is Activity & { workout: Workout } => Boolean(a.workout)).sort((a, b) => b.startLocal.localeCompare(a.startLocal));

/** La última vez que se hizo cada ejercicio (columna «Anterior»). */
export function lastSets(acts: Activity[]): Record<string, WorkoutExercise> {
  const out: Record<string, WorkoutExercise> = {};
  for (const a of withWorkout(acts)) for (const e of a.workout.exercises) out[e.exerciseId] ??= e;
  return out;
}

// ---------- Progresión doble ----------

/** Cuánto se sube de una vez según el material (mancuernas y kettlebells van de 2 en 2 o de 4 en 4). */
const increment = (eq: readonly Equipment[]) => (eq.includes("kettlebell") ? 4 : eq.includes("mancuernas") ? 2 : 2.5);

export interface Suggestion {
  kg?: number;
  reps: number;
  up?: boolean; // toca subir de peso
  text: string;
}

/**
 * Progresión doble: si la última vez llegaste al tope del rango en todas las series efectivas, sube el peso
 * y vuelve al mínimo; si no, el mismo peso con una repetición más. El rango sale de las notas («Rango 8-12»)
 * o de las repeticiones de la rutina (+2 si son pocas, +4 si no). Sin peso, solo una repetición más.
 */
export function nextTarget(last: WorkoutExercise | undefined, plan: RoutineSet | undefined, notes: string | undefined, eq: readonly Equipment[]): Suggestion | undefined {
  const sets = (last?.sets ?? []).filter((s) => working(s) && s.reps);
  if (!sets.length) return undefined;
  const reps = sets.map((s) => s.reps!);
  const lastKg = Math.max(...sets.map((s) => s.kg ?? 0));
  // si la rutina ya pide más peso que el que hiciste, manda la rutina
  if (plan?.kg && plan.kg > lastKg) return undefined;
  if (!lastKg) {
    const r = Math.min(...reps) + 1;
    return { reps: r, text: `Busca ${r} repeticiones: una más que la última vez.` };
  }
  const range = notes?.match(/Rango (\d+)-(\d+)/);
  const lo = range ? Number(range[1]) : (plan?.reps ?? reps[0]);
  const hi = range ? Number(range[2]) : lo + (lo <= 6 ? 2 : 4);
  if (reps.every((r) => r >= hi)) {
    const kg = Math.round((lastKg + increment(eq)) / 0.25) * 0.25;
    return { kg, reps: lo, up: true, text: `Sube a ${fmtNum(kg)} kg: hiciste ${hi} o más en todas las series.` };
  }
  const r = Math.min(hi, Math.min(...reps) + 1);
  return { kg: lastKg, reps: r, text: `Mismo peso y busca ${r} repeticiones (rango ${lo}-${hi}); al llegar a ${hi} en todas, sube.` };
}


// ---------- Récords ----------

export interface StrengthRecord {
  exerciseId: string;
  name: string;
  kind: "peso" | "reps"; // más peso (o lastre) que nunca; sin peso, más repeticiones en una serie
  value: number;
  prev: number;
}

/** Récords de fuerza por actividad, en orden cronológico: la primera vez que haces un ejercicio no cuenta. */
export function strengthRecords(acts: Activity[]): Map<string, StrengthRecord[]> {
  const best = new Map<string, { kg?: number; reps?: number }>();
  const out = new Map<string, StrengthRecord[]>();
  for (const a of withWorkout(acts).reverse()) {
    const top = new Map<string, { name: string; kg: number; reps: number }>();
    for (const e of a.workout.exercises) {
      const sets = e.sets.filter((s) => working(s) && s.reps);
      if (!sets.length) continue;
      const t = top.get(e.exerciseId) ?? { name: e.name, kg: 0, reps: 0 };
      t.kg = Math.max(t.kg, ...sets.map((s) => s.kg ?? 0));
      t.reps = Math.max(t.reps, ...sets.filter((s) => !s.kg).map((s) => s.reps!));
      top.set(e.exerciseId, t);
    }
    const recs: StrengthRecord[] = [];
    for (const [exerciseId, t] of top) {
      const b = best.get(exerciseId) ?? {};
      if (t.kg > 0 && b.kg !== undefined && t.kg > b.kg) recs.push({ exerciseId, name: t.name, kind: "peso", value: t.kg, prev: b.kg });
      else if (!t.kg && t.reps && b.reps !== undefined && t.reps > b.reps) recs.push({ exerciseId, name: t.name, kind: "reps", value: t.reps, prev: b.reps });
      best.set(exerciseId, { kg: t.kg > 0 ? Math.max(b.kg ?? 0, t.kg) : b.kg, reps: t.reps ? Math.max(b.reps ?? 0, t.reps) : b.reps });
    }
    if (recs.length) out.set(a.id, recs);
  }
  return out;
}

// ---------- Progreso de un ejercicio ----------

export interface ExercisePoint {
  activityId: string;
  date: string;
  bw?: boolean;
  sets: WorkoutSet[]; // series efectivas (sin calentamiento)
  oneRm?: number; // mejor 1RM estimado de la sesión
  topKg: number; // más peso (o lastre) de la sesión
  best?: WorkoutSet; // la serie con mejor 1RM (o más repeticiones, sin peso)
  volume: number;
  reps: number;
  maxReps: number;
}

/** Cada sesión en que se hizo un ejercicio, de la más antigua a la más reciente. */
export function exerciseHistory(acts: Activity[], exerciseId: string): ExercisePoint[] {
  return withWorkout(acts)
    .reverse()
    .flatMap((a) => {
      const all = a.workout.exercises.filter((e) => e.exerciseId === exerciseId);
      const pairs = all.flatMap((e) => e.sets.filter((s) => working(s) && s.reps).map((s) => ({ e, s })));
      if (!pairs.length) return [];
      const rm = (p: (typeof pairs)[number]) => estimate1RM(setLoad(p.e, p.s), p.s.reps) ?? 0;
      const top = pairs.reduce((b, p) => (rm(p) > rm(b) || (rm(p) === rm(b) && (p.s.reps ?? 0) > (b.s.reps ?? 0)) ? p : b));
      return [
        {
          activityId: a.id,
          date: a.date,
          bw: all.some((e) => e.bw),
          sets: pairs.map((p) => p.s),
          oneRm: rm(top) || undefined,
          topKg: Math.max(...pairs.map((p) => p.s.kg ?? 0)),
          best: top.s,
          volume: Math.round(pairs.reduce((t, p) => t + setLoad(p.e, p.s) * p.s.reps!, 0)),
          reps: pairs.reduce((t, p) => t + p.s.reps!, 0),
          maxReps: Math.max(...pairs.map((p) => p.s.reps!)),
        },
      ];
    });
}

export interface RoutinePoint {
  date: string;
  volume: number;
  reps: number;
  minutes: number;
}

/** Entrenos de una rutina desde una fecha, del más antiguo al más reciente. */
export function routineHistory(acts: Activity[], routineId: string, since: string): RoutinePoint[] {
  return withWorkout(acts)
    .filter((a) => a.workout.routineId === routineId && a.date >= since)
    .reverse()
    .map((a) => ({ date: a.date, volume: workoutVolume(a.workout), reps: workoutReps(a.workout), minutes: Math.round(a.movingSec / 60) }));
}
