// Chat con el entrenador IA (running y fuerza): sirve corras o no. La llamada está en strength-actions.
// Además de responder, puede dejar listo un entreno que le cuentas, rutinas nuevas o un cambio del plan.
import type { ChatActivity, Db, Feel, Routine, SportKind, StrengthChatMessage, WorkoutExercise } from "../types";
import { WEEKDAYS, addDays, weekday } from "../dates";
import { parseTime } from "../format";
import { CATALOG, allEquipment, allExercises, findExercise } from "./catalog";
import { equipmentFromText, exercisesFromAi } from "./aiRoutines";
import { EQUIPMENT, canDo, type Equipment } from "./labels";
import { estimate1RM } from "./workouts";
import { EXAMPLES_RULE, PREFERENCES_RULE, cleanPreference, preferencesFor, ratedExamples } from "../aiMemory";
import { STUDY_RULE } from "../knowledge";

// lo útil para entrenar fuerza en general (sin estiramientos ni cardio, y sin lo más técnico)
const CANDIDATES = CATALOG.filter((x) => (x.cat === "fuerza" || x.cat === "pliometria" || x.cat === "powerlifting") && x.level !== "avanzado");
const BY_ID = new Map(CANDIDATES.map((x) => [x.id, x]));

export const CHAT_SYSTEM = `Eres un entrenador personal de running y de fuerza con base científica, cercano y claro. Hablas en español de España, en frases cortas y sin emojis.
Atiendes a cualquiera: quien corre (y entonces la fuerza va al servicio de su carrera) y quien solo hace fuerza (ganar músculo, fuerza, salud, perder grasa).

RUNNING: conoces su plan ("plan": próximas sesiones) y lo que ha hecho ("actividadesUltimos14Dias"). Responde sus dudas con eso (Daniels, 80/20 suave/intenso, subir como mucho un 10 % por semana, descarga cada 3-4 semanas, la tirada larga no más del 30 % de la semana).

PRINCIPIOS (pirámide de Helms; Schoenfeld; para corredores, Balsalobre-Fernández 2016, Blagrove 2018, Lauersen 2014):
- Para ganar músculo: 10-20 series efectivas por músculo y semana, cada músculo 2 veces por semana, 6-15 repeticiones a 1-3 RIR. Para fuerza: 3-6 repeticiones en los básicos, descansos largos. Para mantener: en torno a un tercio de ese volumen.
- Si corre: 2-3 sesiones, RPE 7-8, nunca al fallo en multiarticulares, nada pesado de pierna el día antes de la tirada larga o de series; unilaterales, gemelo y sóleo, isquios excéntricos y pliometría.
- Progresión doble: cuando llega al máximo del rango en todas las series, sube el peso. Principiantes: técnica y rangos medios.
- Molestias: semáforo de dolor (0-10). 0-2 sigue igual; 3-4 que no empeora, puede entrenar pero sin subir la carga y con variantes que no duelan; 5 o más, o si empeora o dura más de un día, para esa zona y que lo vea un profesional.
- Usa lo que sabes de él (perfil, material, sus rutinas y lo que ha entrenado) y dilo cuando te apoyes en ello.

${PREFERENCES_RULE}
MEMORIA: si en su mensaje te cuenta algo duradero que debas recordar (ejercicios que no quiere o no puede hacer, gustos, horarios, material nuevo, molestias que vienen de lejos), añádelo en "recordar" como frases cortas en tercera persona («No quiere zancadas», «Tiene una barra de dominadas nueva»). No repitas lo que ya está en "preferencias". Si no hay nada, "recordar": [].

${EXAMPLES_RULE}
${STUDY_RULE}
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

REGISTRAR UN ENTRENO: si te cuenta un entreno que YA ha hecho (hoy u otro día: «hoy he corrido 8 km en 45 minutos, me ha costado», «ayer hice 3×10 de sentadilla con 60 kg»), déjalo listo en "registrar" para que él lo guarde con un botón:
- "tipo": "run" | "walk" | "ride" | "swim" | "strength" | "other". "fecha": AAAA-MM-DD (usa "hoy" del contexto; «ayer» es el día antes). "hora": "HH:MM" solo si la dice.
- "nombre" corto («Rodaje suave», «Pierna»). "km", "tiempo" ("h:mm:ss" o "mm:ss", en movimiento), "desnivel" (m), "fcMedia", "rpe" (1-10) solo si los dice o se deducen sin duda (ritmo × km = tiempo).
- "sensacion": "muy_facil" | "facil" | "bien" | "duro" | "muy_duro" según cómo diga que le fue; "comoSeSintio": sus palabras sobre cómo se sintió (molestias, energía), resumidas.
- Fuerza: "ejercicios": [{"id": "<id exacto de la lista, no el nombre>", "series": [{"kg": 60, "reps": 10}], "bw": false}] (una entrada por serie: «4 series de 8» son 4 entradas). Si dice cuánto duró («en unos 40 minutos»), "tiempo": "40:00"; si no, "tiempo": "".
  Ejemplo: «ayer 3 de 10 de sentadilla con 60 kilos en media hora» → "registrar": {"tipo": "strength", "fecha": "<ayer>", "nombre": "Pierna", "tiempo": "30:00", "ejercicios": [{"id": "Barbell_Squat", "series": [{"kg": 60, "reps": 10}, {"kg": 60, "reps": 10}, {"kg": 60, "reps": 10}]}]}
- Si falta algo imprescindible (en carrera, el tiempo o la distancia y el ritmo), NO inventes: pregúntaselo en "reply" y deja "registrar": null.
- En "reply", 1-2 frases: que lo tiene listo para guardar y un comentario breve sobre el entreno. No lo registres si solo pregunta o planea algo futuro.

CAMBIAR EL PLAN (solo si tiene plan; si no, dile que primero elija su carrera). Lo aplica él con un botón:
- Días que NO puede entrenar («el jueves no puedo», «esta semana solo puedo martes, jueves y sábado»): en "diasSinEntrenar" las fechas (AAAA-MM-DD, de hoy en adelante) en que no puede. «Esta semana» va de hoy al domingo; si dice los días que SÍ puede, pon todos los demás. Las sesiones se mueven solas a los días que le quedan.
- Otros cambios («hazme la tirada larga más corta», «quiero más series»): en "ajustarPlan" un TEXTO (no un objeto) con su petición clara y concreta, con fechas si las hay.
- En "reply" di qué vas a cambiar y que lo aplique con el botón. Si no pide cambiar el plan, "diasSinEntrenar": [] y "ajustarPlan": null.

Responde SOLO con JSON:
{"reply": "tu respuesta (puede tener saltos de línea y listas con guiones)", "recordar": ["..."], "routines": [{"name": "Torso A", "exercises": [{"id": "...", "sets": 3, "reps": "8-12", "kg": 20, "bw": false, "restSec": 90, "notes": "...", "superset": 1}]}], "registrar": null, "diasSinEntrenar": [], "ajustarPlan": null}
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
    plan: db.plan && {
      objetivo: db.plan.goal.name,
      sesionesProximos7Dias: db.plan.weeks
        .flatMap((w) => w.sessions.map((s) => ({ s, fase: w.phase })))
        .filter(({ s }) => s.date >= today && s.date <= addDays(today, 6))
        .map(({ s, fase }) => ({ fecha: s.date, dia: WEEKDAYS[weekday(s.date)], fase, tipo: s.type, titulo: s.title, km: s.distanceKm || undefined, min: s.durationMin })),
    },
    actividadesUltimos14Dias: db.activities
      .filter((a) => a.date >= addDays(today, -13) && a.date <= today)
      .map((a) => ({ fecha: a.date, deporte: a.sport, nombre: a.name, km: a.distanceM ? +(a.distanceM / 1000).toFixed(2) : undefined, min: Math.round(a.movingSec / 60), rpe: a.rpe, sensacion: a.feel })),
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
  registrar?: unknown;
  diasSinEntrenar?: unknown;
  ajustarPlan?: unknown;
}

const SPORTS: SportKind[] = ["run", "walk", "ride", "swim", "strength", "other"];
const FEELS: Feel[] = ["muy_facil", "facil", "bien", "duro", "muy_duro"];
const DEFAULT_NAME: Record<SportKind, string> = { run: "Carrera", walk: "Caminata", ride: "Bici", swim: "Natación", strength: "Fuerza", other: "Entrenamiento" };
const between = (v: unknown, min: number, max: number) => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return v !== null && v !== "" && Number.isFinite(n) && n >= min && n <= max ? n : undefined;
};
// sin tiempo dicho, unos 4 minutos por serie de fuerza
const SEC_PER_SET = 240;

// los básicos por su nombre corto: «sentadilla con barra» es la trasera, no la de a banco
const COMMON_LIFTS: Record<string, string> = {
  sentadilla: "Barbell_Squat",
  "sentadilla con barra": "Barbell_Squat",
  "press banca": "Barbell_Bench_Press_-_Medium_Grip",
  "press de banca": "Barbell_Bench_Press_-_Medium_Grip",
  "peso muerto": "Barbell_Deadlift",
};

/** Ejercicio por su id o, si la IA puso el nombre, por el nombre (sin tildes ni mayúsculas); si no, nada. */
function exerciseFor(db: Pick<Db, "customExercises">, ref: unknown) {
  if (typeof ref !== "string" || !ref.trim()) return;
  const byId = findExercise(db, ref);
  if (byId) return byId;
  const name = plain(ref).trim();
  const common = COMMON_LIFTS[name];
  return common ? findExercise(db, common) : allExercises(db).find((x) => plain(x.name) === name);
}

const DAY_WORDS: [RegExp, number][] = [
  [/\blunes\b/, 0],
  [/\bmartes\b/, 1],
  [/\bmiercoles\b/, 2],
  [/\bjueves\b/, 3],
  [/\bviernes\b/, 4],
  [/\bsabado\b/, 5],
  [/\bdomingo\b/, 6],
];
const daysIn = (t: string) => DAY_WORDS.filter(([re]) => re.test(t)).map(([, d]) => d);

/**
 * Días que dice que no puede entrenar, sacados de su mensaje: «solo puedo martes, jueves y sábado» (los demás de esa semana),
 * «el jueves no puedo», «la semana que viene…». Sin fechas que valgan, undefined.
 */
export function unavailableFromText(message: string, today: string): string[] | undefined {
  const t = plain(message);
  const only = /solo (puedo|podre|voy a poder)/.test(t);
  const cannot = /no (puedo|podre|voy a poder)/.test(t);
  if (!only && !cannot) return;
  const named = daysIn(t);
  if (!named.length) return;
  const nextMonday = addDays(today, 7 - weekday(today));
  // semana a la que se refiere: la que viene, esta (lo que queda) o, si no lo dice, la que tiene por delante
  const week = (start: string) => Array.from({ length: 7 }, (_, i) => addDays(start, i)).filter((d) => d >= today);
  let days = /semana que viene|proxima semana|siguiente semana/.test(t) ? week(nextMonday) : week(addDays(today, -weekday(today)));
  // si de esta semana ya no queda nada útil (es domingo), la siguiente
  if (!/esta semana/.test(t) && days.length <= 1) days = week(nextMonday);
  const out = only ? days.filter((d) => !named.includes(weekday(d))) : days.filter((d) => named.includes(weekday(d)));
  return out.length ? out : undefined;
}

/** Valida el entreno que la IA sacó de lo que contó: fechas, rangos y ejercicios que existen. */
export function activityFromAi(raw: unknown, db: Pick<Db, "customExercises" | "profile">, today: string): ChatActivity | undefined {
  if (!raw || typeof raw !== "object") return;
  const o = raw as Record<string, unknown>;
  const sport = SPORTS.find((s) => s === o.tipo);
  const date = typeof o.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.fecha) && o.fecha <= today && o.fecha >= addDays(today, -60) ? o.fecha : undefined;
  if (!sport || !date) return;
  const exercises: WorkoutExercise[] = [];
  if (sport === "strength")
    for (const e of Array.isArray(o.ejercicios) ? o.ejercicios.slice(0, 20) : []) {
      const x = (e ?? {}) as Record<string, unknown>;
      const ex = exerciseFor(db, x.id) ?? exerciseFor(db, x.nombre);
      const sets = (Array.isArray(x.series) ? x.series.slice(0, 20) : [])
        .map((s) => (s ?? {}) as Record<string, unknown>)
        .map((s) => ({ reps: between(s.reps, 1, 200), kg: between(s.kg, 0.5, 500) }))
        .filter((s) => s.reps)
        .map((s) => (s.kg ? { kg: s.kg, reps: Math.round(s.reps!) } : { reps: Math.round(s.reps!) }));
      if (!ex || !sets.length) continue;
      exercises.push({ exerciseId: ex.id, name: ex.name, sets, ...(x.bw === true ? { bw: true, ...(db.profile?.weightKg ? { bodyKg: db.profile.weightKg } : {}) } : {}) });
    }
  if (sport === "strength" && !exercises.length) return;
  const distanceKm = sport === "strength" ? undefined : between(o.km, 0.1, 400);
  const sets = exercises.reduce((n, e) => n + e.sets.length, 0);
  const durationSec = (typeof o.tiempo === "string" ? parseTime(o.tiempo) : undefined) ?? (sets ? sets * SEC_PER_SET : undefined);
  if (!durationSec || durationSec < 60 || durationSec > 24 * 3600) return;
  // ritmo imposible (más rápido que 2:30 /km): mejor que lo corrija él
  if (sport === "run" && distanceKm && durationSec / distanceKm < 150) return;
  const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
  const rpe = between(o.rpe, 1, 10);
  const out: ChatActivity = { sport, date, name: text(o.nombre, 80) ?? DEFAULT_NAME[sport], durationSec };
  if (typeof o.hora === "string" && /^\d{2}:\d{2}$/.test(o.hora)) out.time = o.hora;
  if (distanceKm) out.distanceKm = distanceKm;
  const elevation = between(o.desnivel, 0, 9000);
  if (elevation) out.elevationGainM = Math.round(elevation);
  const hr = between(o.fcMedia, 40, 230);
  if (hr) out.avgHr = Math.round(hr);
  if (rpe) out.rpe = Math.round(rpe);
  const feel = FEELS.find((f) => f === o.sensacion);
  if (feel) out.feel = feel;
  const feelings = text(o.comoSeSintio, 1000);
  if (feelings) out.feelings = feelings;
  if (exercises.length) out.exercises = exercises;
  return out;
}

/** Valida la respuesta: texto y, si hay, rutinas con ejercicios que existen y que puede hacer. */
export function chatReplyFromAi(
  input: AiChatReply | null | undefined,
  equipment: Equipment[],
  now: string,
  db: Pick<Db, "customExercises" | "profile" | "plan"> = {},
  today = now.slice(0, 10),
  message = "",
): { text: string; routines: Routine[]; remember: string[]; activity?: ChatActivity; planRequest?: string; planDays?: string[] } {
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
  const activity = activityFromAi(raw.registrar, db, today);
  // si la IA marca el cambio pero no lo pone en texto, vale su propio mensaje
  const asked = typeof raw.ajustarPlan === "string" ? raw.ajustarPlan.trim() : raw.ajustarPlan && typeof raw.ajustarPlan === "object" ? message.trim() : "";
  // con días que marcar, el cambio ya está hecho: lo demás (la IA que reajusta) va solo después
  const planRequest = db.plan && asked.length >= 5 && !unavailableFromText(message, today) ? asked.slice(0, 500) : undefined;
  // los días, mejor de su propio mensaje (fiable); si no, los que diga la IA
  const fromText = unavailableFromText(message, today);
  const fromAi = (Array.isArray(raw.diasSinEntrenar) ? raw.diasSinEntrenar : []).filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d));
  const planDays = db.plan ? [...new Set(fromText ?? fromAi)].filter((d) => d >= today && d <= addDays(today, 30)).sort().slice(0, 30) : [];
  return {
    text: text || (routines.length ? "Te propongo estas rutinas:" : activity ? "Lo tengo listo para guardar:" : ""),
    routines,
    remember,
    ...(activity ? { activity } : {}),
    ...(planRequest ? { planRequest } : {}),
    ...(planDays.length ? { planDays } : {}),
  };
}
