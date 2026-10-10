// Entrenador IA de fuerza: lo que se le manda (catálogo y reglas) y la validación de las rutinas que propone.
// La llamada en sí está en strength-actions (generateStrengthRoutines).
import { STRENGTH_KINDS, type StrengthKind } from "../engine/planner";
import type { Db, Phase, Routine, RoutineExercise, RoutineSet } from "../types";
import { addDays } from "../dates";
import { CATALOG } from "./catalog";
import { EQUIPMENT, canDo, type Equipment } from "./labels";

const EQ_IDS = new Set<string>(EQUIPMENT.map((e) => e.id));
const KINDS: StrengthKind[] = ["pierna", "posterior", "superior", "completo"];
export const BLOCK_PHASES: Record<"base" | "fuerza", Phase[]> = { base: ["base"], fuerza: ["construccion", "especifico"] };

// solo fuerza y pliometría, sin halterofilia, powerlifting ni strongman: lo útil para un corredor
const CANDIDATES = CATALOG.filter((x) => (x.cat === "fuerza" || x.cat === "pliometria") && x.level !== "avanzado");

/** Catálogo compacto para el prompt («id | nombre | material | músculos»), solo con lo que se puede hacer con ese material. */
export const exerciseListForAi = (equipment?: Equipment[]) =>
  CANDIDATES.filter((x) => !equipment || canDo(x.eq, equipment))
    .map((x) => `${x.id} | ${x.name} | ${x.eq.join(",")} | ${x.muscles.join(",")}`)
    .join("\n");

// lo que el atleta escribe → códigos de material (sin tildes ni mayúsculas)
const EQUIPMENT_WORDS: [Equipment, RegExp][] = [
  ["mancuernas", /mancuern|dumbbell/],
  ["kettlebell", /kettle|ketel|ketter|pesa rusa|pesas rusas/],
  ["bandas", /banda|cinta|goma|elastic|liga/],
  ["dominadas", /dominad|barra fija|pull ?up/],
  ["banco", /banco|silla|sofa/],
  ["cajon", /cajon|step|escalon|caja/],
  ["barra", /barra (olimpica|con discos|y discos|de pesas)|discos/],
  ["barraZ", /barra z|barra ez/],
  ["jaula", /jaula|rack|soporte/],
  ["maquinas", /maquina|gimnasio|gym/],
  ["poleas", /polea|gimnasio|gym/],
  ["balon", /balon medicinal|medicine ball|slam ball/],
  ["fitball", /fitball|pelota grande|bola de pilates|fit ball/],
  ["rodillo", /rodillo|foam/],
  ["otro", /trx|anilla|paralela|trineo|chaleco/],
];

/** Material que se entiende en el texto del atleta (el peso corporal siempre). */
export function equipmentFromText(text: string): Equipment[] {
  const t = text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const gym = /gimnasio|gym/.test(t);
  const found = EQUIPMENT_WORDS.filter(([, re]) => re.test(t)).map(([e]) => e);
  // en un gimnasio hay de todo
  return gym ? EQUIPMENT.map((e) => e.id) : ["corporal", ...found.filter((e, i) => found.indexOf(e) === i)];
}

export const STRENGTH_SYSTEM = `Eres un preparador de fuerza para corredores, con base científica. Creas rutinas de fuerza en casa para que un corredor prepare su carrera y esté fuerte, con el material que tiene.

PRINCIPIOS (resumen propio de la evidencia: Balsalobre-Fernández 2016, Blagrove 2018, Lauersen 2014, Schumann 2022, Rønnestad y Mujika 2014, y la pirámide de Helms):
- La fuerza va al servicio de la carrera: dosis mínima eficaz, 2-3 sesiones por semana. Mejora la economía de carrera (2-8 %) y reduce lesiones.
- Intensidad por RIR: RPE 7-8 (2-3 repeticiones en reserva). Nunca al fallo en los multiarticulares. Sin agujetas grandes.
- Bloque "base": técnica y tolerancia. 2-3 series de 8-12 en multiarticulares, unilaterales, gemelo y sóleo con muchas repeticiones (15-25), core antirrotación, pliometría suave (comba, pogo).
- Bloque "fuerza" (construcción y específico): multiarticular pesado 3-4 × 4-6 a RPE 7-8 y pliometría de calidad (3-5 × 3-6 saltos, al principio de la sesión y fresco). Gemelo pesado, excéntricos de isquio (nórdico), aductores (Copenhague).
- Tipos de sesión: "pierna" (cuádriceps, glúteo, gemelo; sentadilla, búlgara, step-up, zancada); "posterior" (isquios, glúteo; bisagra de cadera, hip thrust, nórdico; con la pliometría); "superior" (empuje y tirón horizontal y vertical, hombro, core); "completo" (cuerpo entero, si solo hay 1 sesión a la semana).
- Con poco peso (p. ej. mancuernas de 15-18 kg o una kettlebell), para cargar la pierna usa unilaterales (búlgara, step-up, peso muerto rumano a una pierna), más series, tempo lento o pausas.
- Usa lo que el atleta dice que puede hacer para elegir los kilos y las repeticiones iniciales. Nunca más kilos de los que tiene.
- Si tiene lesiones o molestias, no cargues esa zona: elige variantes sin dolor y menciónalo en "notes".
- Descansos: multiarticular pesado 120-180 s, accesorios 60-90 s, pliometría 60-120 s, core 45-60 s.
- Progresión doble: dentro del rango de repeticiones, cuando llegue al máximo en todas las series, sube el peso (o pasa a una variante más difícil si no tiene más peso).
- 4-7 ejercicios por rutina, 30-50 minutos.

REGLAS:
- Usa SOLO ejercicios de la lista ("id" exacto) cuyo material tenga el atleta. "corporal" siempre está disponible.
- Primero traduce su material a estos códigos: ${EQUIPMENT.map((e) => `${e.id} (${e.label})`).join(", ")}.
- Crea una rutina por cada combinación pedida de tipo ("kind") y bloque ("block").
- "reps" es un rango como "8-12" o un número. "kg" solo si usa peso externo (si no, omítelo). "bw": true si es con peso corporal (los "kg" serían lastre).

Responde SOLO con JSON:
{"equipment": ["corporal", ...], "summary": "2-4 frases: cómo has planteado la fuerza para su carrera y con su material", "routines": [{"kind": "pierna", "block": "base", "name": "Pierna · Base", "exercises": [{"id": "...", "sets": 3, "reps": "8-12", "kg": 16, "bw": false, "restSec": 90, "notes": "..."}]}]}`;

/** Lo que se le pide: material, capacidad, lesiones, carrera y qué rutinas hacen falta. */
export function strengthRequest(db: Db, material: string, ability: string, today: string) {
  const per = Math.min(4, db.profile?.strengthPerWeek ?? 2) || 2;
  const kinds = [...new Set(STRENGTH_KINDS[per] ?? STRENGTH_KINDS[2])];
  const plan = db.plan;
  // fases que quedan por delante (incluida la semana en curso)
  const phases = plan ? [...new Set(plan.weeks.filter((w) => addDays(w.start, 6) >= today).map((w) => w.phase))] : [];
  return {
    hoy: today,
    atleta: { edad: db.profile?.age, sexo: db.profile?.sex, pesoKg: db.profile?.weightKg, nivelCorriendo: db.profile?.level, lesiones: db.profile?.injuries || "ninguna" },
    carrera: plan && { nombre: plan.goal.name, km: plan.goal.distanceKm, fecha: plan.goal.date, fasesDelPlan: phases },
    sesionesDeFuerzaPorSemana: per,
    materialQueTiene: material,
    loQuePuedeHacerOSuRutina: ability,
    rutinasAPedir: kinds.flatMap((kind) => (["base", "fuerza"] as const).map((block) => ({ kind, block }))),
    ejerciciosDisponibles: "id | nombre | material | músculos\n" + exerciseListForAi(equipmentFromText(material)),
  };
}

export interface AiStrengthReply {
  equipment?: unknown;
  summary?: unknown;
  routines?: unknown;
}

const num = (v: unknown, min: number, max: number) => {
  const n = Number(typeof v === "string" ? v.replace(",", ".") : v);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
};

/** Valida la respuesta: material conocido, ejercicios que existen y que puede hacer, números razonables. */
export function routinesFromAi(reply: AiStrengthReply, now: string, detected: Equipment[] = []): { equipment: Equipment[]; summary: string; routines: Routine[] } {
  // lo que entendió la IA más lo que se leyó en el texto
  const equipment = [...new Set(["corporal", ...detected, ...(Array.isArray(reply.equipment) ? reply.equipment : [])].map(String).filter((e) => EQ_IDS.has(e)))] as Equipment[];
  const byId = new Map(CANDIDATES.map((x) => [x.id, x]));
  const routines: Routine[] = [];
  for (const raw of Array.isArray(reply.routines) ? reply.routines.slice(0, 8) : []) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const kind = KINDS.includes(r.kind as StrengthKind) ? (r.kind as StrengthKind) : undefined;
    const block = r.block === "fuerza" ? "fuerza" : r.block === "base" ? "base" : undefined;
    if (!kind || !block) continue;
    const exercises: RoutineExercise[] = [];
    for (const e of Array.isArray(r.exercises) ? r.exercises.slice(0, 8) : []) {
      const ex = (e ?? {}) as Record<string, unknown>;
      const x = typeof ex.id === "string" ? byId.get(ex.id) : undefined;
      if (!x || !canDo(x.eq, equipment) || exercises.some((y) => y.exerciseId === x.id)) continue;
      const [lo, hi] = String(ex.reps ?? "").split(/[-–a]/).map((s) => num(s.trim(), 1, 100));
      const sets = Math.round(num(ex.sets, 1, 6) ?? 3);
      const kg = num(ex.kg, 0.5, 300);
      const bw = ex.bw === true || (!kg && x.eq.every((q) => q === "corporal" || q === "dominadas" || q === "banco" || q === "cajon"));
      const set: RoutineSet = {};
      if (lo) set.reps = Math.round(lo);
      if (kg && !bw) set.kg = Math.round(kg * 2) / 2;
      const item: RoutineExercise = { exerciseId: x.id, sets: Array.from({ length: sets }, () => ({ ...set })), restSec: Math.round((num(ex.restSec, 0, 300) ?? 90) / 15) * 15 };
      if (bw) item.bw = true;
      const notes = [hi && lo && hi > lo ? `Rango ${lo}-${hi}: cuando llegues a ${hi} en todas las series, sube peso o dificultad.` : "", typeof ex.notes === "string" ? ex.notes.trim() : ""].filter(Boolean).join(" ");
      if (notes) item.notes = notes.slice(0, 200);
      exercises.push(item);
    }
    if (exercises.length < 2) continue;
    const name = typeof r.name === "string" && r.name.trim() ? r.name.trim().slice(0, 60) : `${kind[0].toUpperCase()}${kind.slice(1)} · ${block === "base" ? "Base" : "Fuerza"}`;
    routines.push({ id: `r_ia_${kind}_${block}`, name, exercises, source: "ia", kind, phases: BLOCK_PHASES[block], createdAt: now, updatedAt: now });
  }
  return { equipment, summary: typeof reply.summary === "string" ? reply.summary.trim().slice(0, 800) : "", routines };
}
