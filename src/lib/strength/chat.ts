// Chat con el entrenador de fuerza (sección Fuerza): sirve corras o no. La llamada está en strength-actions.
import type { Db, Routine, StrengthChatMessage } from "../types";
import { addDays } from "../dates";
import { CATALOG, allEquipment, findExercise } from "./catalog";
import { exercisesFromAi } from "./aiRoutines";
import { EQUIPMENT, canDo, type Equipment } from "./labels";
import { estimate1RM } from "./workouts";

// lo útil para entrenar fuerza en general (sin estiramientos ni cardio, y sin lo más técnico)
const CANDIDATES = CATALOG.filter((x) => (x.cat === "fuerza" || x.cat === "pliometria" || x.cat === "powerlifting") && x.level !== "avanzado");
const BY_ID = new Map(CANDIDATES.map((x) => [x.id, x]));

export const CHAT_SYSTEM = `Eres un entrenador personal de fuerza con base científica, cercano y claro. Hablas en español de España, en frases cortas y sin emojis.
Atiendes a cualquiera: quien corre (y entonces la fuerza va al servicio de su carrera) y quien solo hace fuerza (ganar músculo, fuerza, salud, perder grasa).

PRINCIPIOS (pirámide de Helms; Schoenfeld; para corredores, Balsalobre-Fernández 2016, Blagrove 2018, Lauersen 2014):
- Para ganar músculo: 10-20 series efectivas por músculo y semana, cada músculo 2 veces por semana, 6-15 repeticiones a 1-3 RIR. Para fuerza: 3-6 repeticiones en los básicos, descansos largos. Para mantener: en torno a un tercio de ese volumen.
- Si corre: 2-3 sesiones, RPE 7-8, nunca al fallo en multiarticulares, nada pesado de pierna el día antes de la tirada larga o de series; unilaterales, gemelo y sóleo, isquios excéntricos y pliometría.
- Progresión doble: cuando llega al máximo del rango en todas las series, sube el peso. Principiantes: técnica y rangos medios.
- Si tiene lesiones o molestias, no cargues esa zona: variantes sin dolor y, si el dolor sigue, que lo vea un profesional.
- Usa lo que sabes de él (perfil, material, sus rutinas y lo que ha entrenado) y dilo cuando te apoyes en ello.

CUÁNDO PROPONER RUTINAS: solo si te las pide o si para responder hace falta una rutina nueva o cambiada. Si solo pregunta algo, contesta sin rutinas.
- Usa SOLO ejercicios de la lista ("id" exacto) que pueda hacer con su material. 4-8 ejercicios por rutina.
- "reps" es un rango como "8-12" o un número; "kg" solo con peso externo y nunca más del que tiene; "bw": true si es con peso corporal (los "kg" serían lastre).
- "superset": mismo número en ejercicios seguidos para hacerlos en superserie (opcional).
- Descansos: básicos pesados 120-180 s, accesorios 60-90 s, core 45-60 s.

Responde SOLO con JSON:
{"reply": "tu respuesta (puede tener saltos de línea y listas con guiones)", "routines": [{"name": "Torso A", "exercises": [{"id": "...", "sets": 3, "reps": "8-12", "kg": 20, "bw": false, "restSec": 90, "notes": "...", "superset": 1}]}]}
Si no propones rutinas, "routines": [].`;

/** Lo que el entrenador sabe del atleta: perfil, material, rutinas, entrenos de las últimas 4 semanas y su carrera. */
export function chatContext(db: Db, today: string) {
  const since = addDays(today, -28);
  const lifts = new Map<string, { nombre: string; sesiones: number; mejorSerie: string; ultimaVez: string; best: number }>();
  for (const a of db.activities.filter((x) => x.workout && x.date >= since))
    for (const e of a.workout!.exercises) {
      const cur = lifts.get(e.exerciseId) ?? { nombre: e.name, sesiones: 0, mejorSerie: "", ultimaVez: a.date, best: -1 };
      cur.sesiones++;
      if (a.date > cur.ultimaVez) cur.ultimaVez = a.date;
      for (const s of e.sets.filter((x) => x.type !== "calentamiento" && x.reps)) {
        const score = estimate1RM((e.bw ? (e.bodyKg ?? 0) : 0) + (s.kg ?? 0), s.reps) ?? s.reps!;
        if (score > cur.best) Object.assign(cur, { best: score, mejorSerie: `${e.bw ? `peso corporal${s.kg ? ` + ${s.kg} kg` : ""}` : `${s.kg ?? 0} kg`} × ${s.reps}` });
      }
      lifts.set(e.exerciseId, cur);
    }
  const p = db.profile;
  return {
    hoy: today,
    atleta: p && { nombre: p.name.split(" ")[0], edad: p.age, sexo: p.sex, pesoKg: p.weightKg, alturaCm: p.heightCm, lesiones: p.injuries || "ninguna", sesionesDeFuerzaPorSemana: p.strengthPerWeek },
    corre: Boolean(db.plan) || db.activities.some((a) => a.sport === "run" && a.date >= since),
    carrera: db.plan && { nombre: db.plan.goal.name, km: db.plan.goal.distanceKm, fecha: db.plan.goal.date },
    lugares: (db.places ?? []).map((pl) => ({ nombre: pl.name, material: pl.equipment, notas: pl.notes })),
    susRutinas: (db.routines ?? []).map((r) => ({ nombre: r.name, ejercicios: r.exercises.map((e) => `${findExercise(db, e.exerciseId)?.name ?? e.exerciseId} ${e.sets.length}×${e.sets[0]?.reps ?? "?"}`) })),
    entrenosUltimas4Semanas: [...lifts.values()].map((l) => ({ nombre: l.nombre, sesiones: l.sesiones, mejorSerie: l.mejorSerie, ultimaVez: l.ultimaVez })),
    medidas: db.measurements?.at(-1),
  };
}

/** Material con el que puede entrenar (sin lugares apuntados, todo). */
export const chatEquipment = (db: Pick<Db, "places">): Equipment[] => (db.places?.length ? allEquipment(db) : EQUIPMENT.map((e) => e.id));

/** Lista de ejercicios para el prompt, solo los que puede hacer: «id | nombre». */
export const chatExerciseList = (equipment: Equipment[]) =>
  CANDIDATES.filter((x) => canDo(x.eq, equipment))
    .map((x) => `${x.id} | ${x.name}`)
    .join("\n");

/** Los últimos mensajes como conversación para el modelo (las rutinas propuestas, resumidas). */
export const chatHistory = (messages: StrengthChatMessage[]) =>
  messages.slice(-12).map((m) => ({
    role: m.role,
    content: m.routines?.length ? `${m.text}\n[Propuse: ${m.routines.map((r) => r.name).join(", ")}${m.saved ? " (las guardó)" : ""}]` : m.text,
  }));

export interface AiChatReply {
  reply?: unknown;
  routines?: unknown;
}

/** Valida la respuesta: texto y, si hay, rutinas con ejercicios que existen y que puede hacer. */
export function chatReplyFromAi(raw: AiChatReply, equipment: Equipment[], now: string): { text: string; routines: Routine[] } {
  const text = typeof raw.reply === "string" ? raw.reply.trim().slice(0, 4000) : "";
  const routines: Routine[] = [];
  for (const r of Array.isArray(raw.routines) ? raw.routines.slice(0, 6) : []) {
    const o = (r ?? {}) as Record<string, unknown>;
    const exercises = exercisesFromAi(o.exercises, BY_ID, equipment);
    if (exercises.length < 2) continue;
    const name = typeof o.name === "string" && o.name.trim() ? o.name.trim().slice(0, 60) : `Rutina ${routines.length + 1}`;
    routines.push({ id: "", name, exercises, folder: "Entrenador IA", createdAt: now, updatedAt: now });
  }
  return { text: text || (routines.length ? "Te propongo estas rutinas:" : ""), routines };
}
