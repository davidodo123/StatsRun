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
  covers: Pattern[]; // patrones de movimiento que ya trabaja
}

/** Patrón de movimiento: para completar una rutina corta con lo que le falta de la plantilla del plan. */
export type Pattern = "empuje" | "tiron" | "vertical" | "hombro" | "core" | "sentadilla" | "bisagra" | "gemelo" | "aductor" | "pliometria";

const MUSCLE_PATTERN: Partial<Record<Muscle, Pattern>> = {
  pecho: "empuje",
  triceps: "empuje",
  espalda: "tiron",
  biceps: "tiron",
  trapecio: "tiron",
  dorsal: "vertical",
  hombros: "hombro",
  abdomen: "core",
  lumbar: "core",
  cuadriceps: "sentadilla",
  isquios: "bisagra",
  gluteos: "bisagra",
  gemelos: "gemelo",
  aductores: "aductor",
};

// qué trabaja cada línea de las plantillas del plan (por su texto)
const STEP_PATTERNS: [Pattern, RegExp][] = [
  ["pliometria", /salto|pogo|comba|multisalto|pliometr/i],
  ["vertical", /dominada|jalón/i],
  ["hombro", /press de hombro|press militar/i],
  ["empuje", /flexion|press de banca|press con mancuernas/i],
  ["tiron", /remo/i],
  ["core", /core|plancha|dead bug|pallof|rueda/i],
  ["sentadilla", /sentadilla|búlgara|step-up|zancada/i],
  ["bisagra", /peso muerto|hip thrust|puente|nórdico/i],
  ["gemelo", /gemelo|sóleo/i],
  ["aductor", /copenhague/i],
];
export const stepPatterns = (step: string) => STEP_PATTERNS.filter(([, re]) => re.test(step)).map(([p]) => p);

/** Líneas de la plantilla que la rutina no cubre (las de pauta general, sin patrón, no se repiten). */
export function complementSteps(template: string[], covers: Pattern[]): string[] {
  return template.filter((s) => {
    const p = stepPatterns(s);
    return p.length > 0 && p.some((x) => !covers.includes(x));
  });
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
    const covers = [
      ...new Set(
        exercises.flatMap(({ x }) => [
          ...(x?.muscles ?? []).map((m) => MUSCLE_PATTERN[m]).filter((p): p is Pattern => Boolean(p)),
          ...(x?.cat === "pliometria" ? (["pliometria"] as Pattern[]) : []),
        ]),
      ),
    ];
    return {
      id: r.id,
      name: r.name,
      zone: routineZone(exercises.map(({ x }) => x?.muscles ?? [])),
      steps,
      durationMin: Math.min(120, Math.max(20, Math.round(sets * 2.5 + 5))),
      covers,
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
      // rutina corta: se completa con lo que le falta de la plantilla de esa zona (remo, hombro, core…)
      const extra = complementSteps(base.steps, r.covers);
      const steps = [...r.steps, ...extra.map((s) => `+ ${s}`)];
      if (maintenance) steps.push(w.recovery ? "Semana de descarga: la mitad de series, mismo peso." : "Fase específica: 1-2 series menos por ejercicio, lejos del fallo.");
      const minutes = r.durationMin + extra.length * 6;
      return {
        ...base,
        title: r.name,
        description: extra.length
          ? `Tu rutina «${r.name}» y, marcado con +, lo que le falta del plan para trabajar ${s.strengthKind === "superior" ? "todo el tren superior" : "toda la pierna"}. ${base.description}`
          : `Tu rutina «${r.name}». ${base.description}`,
        steps,
        durationMin: Math.min(120, maintenance ? Math.round(minutes * 0.7) : minutes),
        routineId: r.id,
      };
    });
}
