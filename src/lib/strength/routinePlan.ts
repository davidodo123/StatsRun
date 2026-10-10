// Mete las rutinas del usuario en las sesiones de fuerza del plan: las de pierna en los huecos de pierna,
// las de tren superior en los de superior (el planificador decide qué tipo toca cada día).
import { strengthSession, type StrengthKind } from "../engine/planner";
import type { Db, Plan } from "../types";
import { findExercise } from "./catalog";
import type { Muscle } from "./labels";

export type RoutineZone = "inferior" | "superior" | "completo";

export interface RoutineForPlan {
  id: string;
  name: string;
  zone: RoutineZone;
  steps: string[];
  durationMin: number;
}

const LOWER = new Set<Muscle>(["cuadriceps", "isquios", "gluteos", "gemelos", "aductores", "abductores"]);
const UPPER = new Set<Muscle>(["pecho", "espalda", "dorsal", "hombros", "biceps", "triceps", "trapecio", "antebrazos", "cuello"]);

/** Zona que trabaja una rutina según los músculos principales de sus ejercicios (el core no cuenta). */
export function routineZone(muscles: Muscle[][]): RoutineZone {
  let lower = 0;
  let upper = 0;
  for (const m of muscles) {
    if (m.some((x) => LOWER.has(x))) lower++;
    else if (m.some((x) => UPPER.has(x))) upper++;
  }
  if (lower && lower >= upper * 2) return "inferior";
  if (upper && upper >= lower * 2) return "superior";
  return "completo";
}

const range = (xs: number[]) => {
  if (!xs.length) return "";
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  return lo === hi ? `${lo}` : `${lo}-${hi}`;
};

/** Rutinas del usuario listas para el plan: zona, pasos («3 × 8-10 Sentadilla a 80 kg») y duración estimada. */
export function routinesForPlan(db: Pick<Db, "routines" | "customExercises">): RoutineForPlan[] {
  return (db.routines ?? []).map((r) => {
    const exercises = r.exercises.map((e) => ({ e, x: findExercise(db, e.exerciseId) }));
    const steps = exercises.map(({ e, x }) => {
      const work = e.sets.filter((s) => s.type !== "calentamiento");
      const reps = range(work.map((s) => s.reps ?? 0).filter(Boolean));
      const kgs = [...new Set(work.map((s) => s.kg).filter((k): k is number => k !== undefined))];
      const load = e.bw ? (kgs.length === 1 && kgs[0] ? ` con peso corporal + ${kgs[0]} kg` : " con peso corporal") : kgs.length === 1 ? ` a ${kgs[0]} kg` : kgs.length ? ` a ${Math.min(...kgs)}-${Math.max(...kgs)} kg` : "";
      return `${work.length || e.sets.length} × ${reps || "?"} ${x?.name ?? "ejercicio"}${load}`;
    });
    const sets = r.exercises.reduce((t, e) => t + e.sets.length, 0);
    return {
      id: r.id,
      name: r.name,
      zone: routineZone(exercises.map(({ x }) => x?.muscles ?? [])),
      steps,
      durationMin: Math.min(120, Math.max(20, Math.round(sets * 2.5 + 5))),
    };
  });
}

const WANTS: Record<StrengthKind, RoutineZone[]> = {
  pierna: ["inferior", "completo"],
  posterior: ["inferior", "completo"],
  superior: ["superior", "completo"],
  completo: ["completo", "inferior", "superior"],
};

/**
 * Rehace las sesiones de fuerza futuras del plan: plantilla del tipo y la fase y, si hay una rutina del usuario
 * de esa zona, su contenido (rotando entre rutinas de la misma zona). En afinamiento se queda la activación.
 */
export function applyStrengthRoutines(plan: Plan, routines: RoutineForPlan[], today: string): void {
  const turn: Record<RoutineZone, number> = { inferior: 0, superior: 0, completo: 0 };
  for (const w of plan.weeks)
    w.sessions = w.sessions.map((s) => {
      if (s.type !== "strength" || !s.strengthKind || s.date < today) return s;
      const base = { ...strengthSession(s.date, w.phase, s.strengthKind), id: s.id };
      if (w.phase === "taper") return base;
      const zone = WANTS[s.strengthKind].find((z) => routines.some((r) => r.zone === z));
      if (!zone) return base;
      const options = routines.filter((r) => r.zone === zone);
      const r = options[turn[zone]++ % options.length];
      const maintenance = w.phase === "especifico" || w.recovery;
      return {
        ...base,
        title: r.name,
        description: `Tu rutina «${r.name}». ${base.description}`,
        steps: maintenance ? [...r.steps, w.recovery ? "Semana de descarga: la mitad de series, mismo peso." : "Fase específica: 1-2 series menos por ejercicio, lejos del fallo."] : r.steps,
        durationMin: maintenance ? Math.round(r.durationMin * 0.7) : r.durationMin,
        routineId: r.id,
      };
    });
}
