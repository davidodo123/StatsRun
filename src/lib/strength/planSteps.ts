// Las sesiones de fuerza del plan sin rutina propia llevan los ejercicios en texto («3 × 8-12 sentadilla goblet a RPE 7»).
// Aquí se pasan a ejercicios del catálogo con sus series, para empezar el entreno en vivo ya relleno.
import type { Db, RoutineExercise } from "../types";
import { findExercise } from "./catalog";

const plain = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// nombre (sin tildes) → ejercicio del catálogo; los más concretos primero
const KEYWORDS: [string, string][] = [
  ["pallof", "Pallof_Press"],
  ["rueda abdominal", "Ab_Roller"],
  ["dead bug", "Dead_Bug"],
  ["copenhague", "rio_copenhagen_plank"],
  ["plancha lateral", "Side_Bridge"],
  ["plancha", "Plank"],
  ["cajon", "Front_Box_Jump"],
  ["pogo", "rio_pogo_jumps"],
  ["multisalto", "rio_bounding"],
  ["comba", "Rope_Jumping"],
  ["sentadilla goblet", "Goblet_Squat"],
  ["bulgara", "Split_Squat_with_Dumbbells"],
  ["sentadilla", "Barbell_Squat"],
  ["peso muerto rumano", "Romanian_Deadlift"],
  ["hip thrust", "Barbell_Hip_Thrust"],
  ["puente", "Butt_Lift_Bridge"],
  ["curl nordico", "Floor_Glute-Ham_Raise"],
  ["step-up", "Dumbbell_Step_Ups"],
  ["zancada", "Dumbbell_Lunges"],
  ["soleo", "Seated_Calf_Raise"],
  ["gemelo", "Standing_Calf_Raises"],
  ["press de banca", "Barbell_Bench_Press_-_Medium_Grip"],
  ["press inclinado", "Incline_Dumbbell_Press"],
  ["press de hombro", "Dumbbell_Shoulder_Press"],
  ["press militar con mancuernas", "Dumbbell_Shoulder_Press"],
  ["press militar", "Standing_Military_Press"],
  ["press con mancuernas", "Dumbbell_Bench_Press"],
  ["flexiones", "Pushups"],
  ["fondos", "Bench_Dips"],
  ["aperturas", "Dumbbell_Flyes"],
  ["dominada", "Pullups"],
  ["jalon", "Wide-Grip_Lat_Pulldown"],
  ["remo invertido", "Inverted_Row"],
  ["remo al menton", "Upright_Barbell_Row"],
  ["remo con barra", "Bent_Over_Barbell_Row"],
  ["remo", "One-Arm_Dumbbell_Row"],
  ["elevaciones laterales", "Side_Lateral_Raise"],
  ["elevaciones frontales", "Front_Dumbbell_Raise"],
  ["pajaros", "Reverse_Flyes"],
  ["face pull", "Face_Pull"],
  ["curl de biceps", "Dumbbell_Bicep_Curl"],
  ["extension de triceps", "Triceps_Pushdown_-_Rope_Attachment"],
];

function exerciseId(db: Pick<Db, "customExercises">, name: string): string | undefined {
  const n = plain(name);
  const hit = KEYWORDS.find(([k]) => n.includes(k));
  return hit && findExercise(db, hit[1]) ? hit[1] : undefined;
}

// «2 rondas: puente glúteo 12, plancha 30″…»: cada ejercicio con tantas series como rondas
const ROUNDS = /^(\d+)\s+rondas?:\s*(.+)$/i;
const ROUND_ITEM = /^(.+?)\s+(\d+)(″|\/lado|\/pierna)?$/;

// «3 × 8-12 nombre…», «3 × 40″ nombre» o «nombre 3 × 10/lado»
const LEADING = /^(\d+)\s*×\s*(\d+)(?:-(\d+))?(″|\/lado|\/pierna)?\s+(.+)$/;
const TRAILING = /^(.+?)\s+(\d+)\s*×\s*(\d+)(?:-(\d+))?(″|\/lado|\/pierna)?/;

/** Nombre limpio: sin paréntesis, sin «a RPE…», y de las alternativas («X o Y»), la primera. */
const cleanName = (t: string) =>
  t
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+a RPE.*$/i, "")
    .replace(/,.*$/, "")
    .split(/\s+o\s+/)[0]
    .trim();

/** Ejercicios de las líneas de una sesión del plan; las que no son ejercicios (pautas) se ignoran. */
export function exercisesFromSteps(steps: string[], db: Pick<Db, "customExercises"> = {}): RoutineExercise[] {
  const out: RoutineExercise[] = [];
  for (const raw of steps) {
    const rounds = raw.match(ROUNDS);
    // «Core: …», «Pliometría primero: …»: lo de antes de los dos puntos es el título
    const body = rounds
      ? rounds[2]
          .split(/,\s*/)
          .map((item) => item.match(ROUND_ITEM))
          .filter((m): m is RegExpMatchArray => Boolean(m))
          .map((m) => `${rounds[1]} × ${m[2]}${m[3] ?? ""} ${m[1]}`)
          .join(" + ")
      : raw.replace(/^\+\s*/, "").replace(/^[^:\d]*:\s*/, "");
    for (const part of body.split(/\s+\+\s+|,\s+(?=\d)|\s+y\s+(?=\d)/)) {
      const lead = part.match(LEADING);
      const trail = lead ? undefined : part.match(TRAILING);
      if (!lead && !trail) continue;
      const [sets, lo, hi, unit, names] = lead ? [lead[1], lead[2], lead[3], lead[4], lead[5]] : [trail![2], trail![3], trail![4], trail![5], trail![1]];
      // «curl de bíceps y extensión de tríceps 3 × 10-15»: dos ejercicios con las mismas series
      for (const name of cleanName(names).split(/\s+y\s+/)) {
        const id = exerciseId(db, name);
        if (!id) continue;
        const x = findExercise(db, id)!;
        const hold = unit === "″";
        const reps = Number(hi ?? lo);
        const bw = x.eq.every((e) => e === "corporal" || e === "dominadas" || e === "banco" || e === "cajon");
        const note = [hold ? `${lo}″ por serie` : "", unit === "/lado" ? "Por lado" : unit === "/pierna" ? "Por pierna" : "", hi ? `${lo}-${hi} repeticiones` : ""].filter(Boolean).join(" · ");
        out.push({
          exerciseId: id,
          sets: Array.from({ length: Math.min(10, Number(sets)) }, () => (hold ? {} : { reps })),
          ...(bw ? { bw: true } : {}),
          restSec: /cajon|pogo|multisalto|comba/.test(plain(name)) ? 60 : 90,
          ...(note ? { notes: note } : {}),
        });
      }
    }
  }
  return out;
}
