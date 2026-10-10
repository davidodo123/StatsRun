// Rutinas y entrenos de fuerza: validación de lo que llega del navegador, volumen, historial y «anterior».
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

/** Texto de la carga: «PC», «PC + 10 kg» o «80 kg». */
export const fmtLoad = (bw: boolean | undefined, kg?: number) => (bw ? (kg ? `PC + ${kg} kg` : "PC") : kg !== undefined ? `${kg} kg` : "–");

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
