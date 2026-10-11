// Chat con el entrenador de fuerza (sección Fuerza): sirve corras o no. La llamada está en strength-actions.
import type { Db, Routine, StrengthChatMessage } from "../types";
import { addDays } from "../dates";
import { CATALOG, allEquipment, findExercise } from "./catalog";
import { equipmentFromText, exercisesFromAi } from "./aiRoutines";
import { EQUIPMENT, canDo, type Equipment } from "./labels";
import { estimate1RM } from "./workouts";
import { EXAMPLES_RULE, PREFERENCES_RULE, cleanPreference, preferencesFor, ratedExamples } from "../aiMemory";

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

${PREFERENCES_RULE}
MEMORIA: si en su mensaje te cuenta algo duradero que debas recordar (ejercicios que no quiere o no puede hacer, gustos, horarios, material nuevo, molestias que vienen de lejos), añádelo en "recordar" como frases cortas en tercera persona («No quiere zancadas», «Tiene una barra de dominadas nueva»). No repitas lo que ya está en "preferencias". Si no hay nada, "recordar": [].

${EXAMPLES_RULE}
MATERIAL: si viene "materialParaEsteMensaje", entrena hoy con eso (la lista de ejercicios ya viene filtrada): no propongas nada que pida otro material aunque lo tenga en otro lugar.

EJEMPLOS (orientativos, no los copies tal cual):
1) «Hoy estoy en casa con dos mancuernas de 10 kg, ¿qué hago de pierna?» (tiene un gimnasio apuntado, pero "materialParaEsteMensaje" dice mancuernas). Bien: rutina solo con mancuernas y peso corporal (sentadilla con mancuernas, peso muerto rumano a una pierna, puente de glúteo, gemelo a una pierna), con más repeticiones o bajada lenta porque el peso es poco; "recordar": [] porque es solo hoy. Mal: sentadilla con barra o prensa.
2) «¿Cada cuánto subo peso en press banca?» Bien: 2-4 frases sobre la progresión doble (cuando llegues al tope del rango en todas las series, sube 2,5 kg) y "routines": [], "recordar": [].
3) «Me operé el hombro, nada de press por encima de la cabeza.» Bien: "recordar": ["Operado del hombro: sin press por encima de la cabeza"] y, si pide rutina, sin ese movimiento.

CUÁNDO PROPONER RUTINAS: solo si te las pide o si para responder hace falta una rutina nueva o cambiada. Si solo pregunta algo, contesta sin rutinas.
- Usa SOLO ejercicios de la lista ("id" exacto) que pueda hacer con su material. CADA rutina lleva entre 5 y 8 ejercicios (nunca menos de 5), salvo que pida algo más corto.
- "reps" es un rango como "8-12" o un número; "kg" solo con peso externo y nunca más del que tiene; "bw": true si es con peso corporal (los "kg" serían lastre).
- "superset": mismo número en ejercicios seguidos para hacerlos en superserie (opcional).
- Descansos: básicos pesados 120-180 s, accesorios 60-90 s, core 45-60 s.
- Si propones rutinas, en "reply" no repitas la lista de ejercicios (ya se ve en la tarjeta): explica en 2-4 frases el planteamiento, la progresión y los avisos.

Responde SOLO con JSON:
{"reply": "tu respuesta (puede tener saltos de línea y listas con guiones)", "recordar": ["..."], "routines": [{"name": "Torso A", "exercises": [{"id": "...", "sets": 3, "reps": "8-12", "kg": 20, "bw": false, "restSec": 90, "notes": "...", "superset": 1}]}]}
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
    preferencias: preferencesFor(db, "fuerza"),
    valoraciones: ratedExamples(db, "chat"),
  };
}

const ALL = EQUIPMENT.map((e) => e.id);
const plain = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Material con el que va a entrenar. Si el mensaje dice dónde o con qué («en casa», «solo mancuernas», «sin material»,
 * el nombre de uno de sus lugares), manda eso; si no, todo lo de sus lugares (sin lugares apuntados, todo).
 * `from` explica a la IA de dónde sale.
 */
export function chatEquipment(db: Pick<Db, "places">, message = ""): { equipment: Equipment[]; from?: string } {
  const t = plain(message);
  // palabras sueltas, para que «casa» no coincida con «casada»
  const words = ` ${t.replace(/[^a-z0-9ñ]+/g, " ")} `;
  const place = db.places?.find((p) => {
    const name = plain(p.name).replace(/[^a-z0-9ñ]+/g, " ").trim();
    return name.length >= 3 && words.includes(` ${name} `);
  });
  if (place) return { equipment: place.equipment, from: `lo que tiene en «${place.name}», que nombra en su mensaje` };
  if (/sin material|solo (con )?mi (propio )?cuerpo|peso corporal|nada de material/.test(t)) return { equipment: ["corporal"], from: "su mensaje: sin material" };
  if (/gimnasio|gym/.test(t)) return { equipment: ALL, from: "su mensaje: en el gimnasio" };
  const said = equipmentFromText(message);
  if (said.length > 1) return { equipment: said, from: "el material que nombra en su mensaje" };
  return { equipment: db.places?.length ? allEquipment(db) : ALL };
}

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
  recordar?: unknown;
  routines?: unknown;
}

/** Valida la respuesta: texto y, si hay, rutinas con ejercicios que existen y que puede hacer. */
export function chatReplyFromAi(input: AiChatReply | null | undefined, equipment: Equipment[], now: string): { text: string; routines: Routine[]; remember: string[] } {
  const raw = input && typeof input === "object" ? input : {};
  const text = typeof raw.reply === "string" ? raw.reply.trim().slice(0, 4000) : "";
  const routines: Routine[] = [];
  for (const r of Array.isArray(raw.routines) ? raw.routines.slice(0, 6) : []) {
    const o = (r ?? {}) as Record<string, unknown>;
    const exercises = exercisesFromAi(o.exercises, BY_ID, equipment);
    if (exercises.length < 2) continue;
    const name = typeof o.name === "string" && o.name.trim() ? o.name.trim().slice(0, 60) : `Rutina ${routines.length + 1}`;
    routines.push({ id: "", name, exercises, folder: "Entrenador IA", createdAt: now, updatedAt: now });
  }
  const remember = (Array.isArray(raw.recordar) ? raw.recordar : []).map(cleanPreference).filter((t) => t.length >= 3).slice(0, 5);
  return { text: text || (routines.length ? "Te propongo estas rutinas:" : ""), routines, remember };
}
