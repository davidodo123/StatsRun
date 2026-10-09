import "server-only";
// Entrenador IA (OpenRouter): reajusta y reprograma las sesiones de los próximos días (carrera y fuerza)
// a partir de las actividades registradas, la carga, el cumplimiento y la disponibilidad del atleta.
// El planificador determinista sigue mandando en la estructura (fases, volumen semanal);
// la IA reescribe, mueve o quita sesiones existentes dentro de límites seguros.
import { readDbNow, updateDb } from "./db";
import { computeStats } from "./engine/stats";
import { availableDaysOf, isHardSession, matchPlan } from "./engine/planner";
import { trainingPaces } from "./engine/physiology";
import { WEEKDAYS, addDays, diffDays, todayLocal, weekday } from "./dates";
import type { Db, PlannedSession, SessionType } from "./types";

const API = "https://openrouter.ai/api/v1/chat/completions";
const HORIZON_DAYS = 14;

export function coachConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  return { apiKey, model, configured: Boolean(apiKey) };
}

/** Llamada a OpenRouter que devuelve el primer objeto JSON de la respuesta. */
async function chatJson<T>(system: string, user: string, temperature = 0.4): Promise<T> {
  const { apiKey, model } = coachConfig();
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
      "X-Title": "StatsRun",
    },
    body: JSON.stringify({
      model,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const content: string = json.choices?.[0]?.message?.content ?? "";
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("La IA no devolvió JSON.");
  return JSON.parse(content.slice(start, end + 1)) as T;
}

// ---------------- Reajuste del plan ----------------

const TYPES: SessionType[] = [
  "easy", "recovery", "long", "tempo", "intervals", "repetitions", "marathon_pace",
  "race_pace", "hills", "fartlek", "strides", "run_walk", "strength",
];

interface AiSession {
  id: string;
  date?: string;
  remove?: boolean;
  type?: string;
  title?: string;
  description?: string;
  steps?: string[];
  distanceKm?: number;
  durationMin?: number;
  reason?: string;
}

interface AiResponse {
  summary?: string;
  sessions?: AiSession[];
}

const SYSTEM = `Eres un entrenador de running y fuerza titulado. Reajustas y reprogramas un plan existente según los datos reales y la disponibilidad del atleta.
Reglas:
- Solo puedes tocar las sesiones de "sesionesAAjustar" (mismo "id"). No inventes ids.
- Puedes cambiar la fecha de una sesión ("date"), pero SOLO a una de "fechasLibres". Nunca dos sesiones de carrera el mismo día ni dos de fuerza el mismo día (fuerza + carrera el mismo día sí).
- Nunca pongas dos sesiones duras (larga, tempo, series, cuestas, fartlek, ritmo carrera) en días consecutivos.
- Si hay sesiones no realizadas ("sesionesNoRealizadas"): NO intentes recuperarlo todo ni acumular. Si se perdió una sesión clave, puedes recolocarla o sustituir un rodaje próximo por una versión reducida; si se perdieron varias, baja la intensidad unos días y retoma la progresión. Explica el criterio.
- Puedes quitar una sesión con {"id","remove":true} si la semana queda sobrecargada.
- No subas la distancia de una sesión más de un 15 % (o 2 km) respecto a la original.
- Las SENSACIONES del atleta ("sensacion" y "comoSeSintio" en sus actividades, sobre todo las de los últimos 7 días) son lo que más pesa. Compáralas con la sesión que tenía planificada ("sesionPlanificada"):
  · "muy_facil"/"facil" o dice que le sobró (podría ir más rápido, iba cómodo) y la carga está controlada (ACWR ≤ 1.3): sube un poco la exigencia de las próximas sesiones de calidad (ritmo algo más rápido dentro del rango, una repetición más, o +5-10 % de distancia), nunca todo a la vez.
  · "duro"/"muy_duro", le costó terminar, piernas cargadas o mal descanso: baja intensidad o volumen de los próximos 2-4 días; si fue una sesión clave, repítela más adelante sin endurecerla.
  · Dolor o molestia (articulación, tendón, gemelo, rodilla…): quita intensidad, cambia carrera de calidad por suave o descanso, y en fuerza evita cargar la zona. Menciónalo en "summary".
  · "bien": mantén la progresión prevista.
- Si hay fatiga alta (ACWR > 1.3, TSB muy negativo, RPE alto), reduce intensidad/volumen o cambia calidad por suave.
- Si cumple bien y va fresco, puedes afinar la calidad (series, ritmos) sin pasarte.
- En "summary" explica qué has cambiado haciendo referencia a lo que dijo el atleta (ej.: "Como el jueves las series se te hicieron fáciles…").
- Fuerza ("strength", distanceKm 0): adapta ejercicios concretos, series, repeticiones y carga a la fase, nivel, lesiones y fatiga de piernas; mejor el mismo día que una sesión dura o lejos de la tirada larga.
- Usa los ritmos proporcionados (min:seg /km) en los pasos de carrera.
- Escribe en español, pasos breves y accionables.
Responde SOLO con JSON: {"summary": "2-4 frases explicando qué has cambiado y por qué", "sessions": [{"id","date","type","title","description","steps":[...],"distanceKm","durationMin","reason"} | {"id","remove":true,"reason"}]}.
Incluye solo las sesiones que cambies.`;

const pace = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

function buildContext(db: Db, today: string) {
  const { profile, plan } = db;
  if (!profile || !plan) return undefined;
  const stats = computeStats(db.activities, profile, today);
  const matches = matchPlan(plan, db.activities, today);
  const end = addDays(today, HORIZON_DAYS);
  const weekOf = (d: string) => plan.weeks.find((w) => d >= w.start && d <= addDays(w.start, 6));
  const avail = availableDaysOf(profile);
  const blocked = new Set(db.unavailableDates ?? []);
  const lastDay = addDays(plan.goal.date, -2);

  const upcoming = plan.weeks
    .flatMap((w) => w.sessions)
    .filter((s) => s.date >= today && s.date < end && s.type !== "race" && matches.get(s.id)?.status !== "done");
  if (!upcoming.length) return undefined;

  const freeDates: string[] = [];
  for (let d = today; d < end && d <= lastDay; d = addDays(d, 1))
    if (avail.includes(weekday(d)) && !blocked.has(d) && weekOf(d)) freeDates.push(d);

  const missed = [...matches.values()].filter((m) => m.session.date < today && diffDays(today, m.session.date) <= 7 && (m.status === "missed" || m.status === "partial"));

  // sesión del plan a la que corresponde cada actividad (registrada para ella o del mismo día)
  const sessionOf = new Map<string, PlannedSession>();
  for (const m of matches.values()) for (const a of m.activities) sessionOf.set(a.id, m.session);
  const planned = (a: Db["activities"][number]) => {
    const s = (a.sessionId && plan.weeks.flatMap((w) => w.sessions).find((x) => x.id === a.sessionId)) || sessionOf.get(a.id);
    return s && { tipo: s.type, titulo: s.title, km: s.distanceKm, min: s.durationMin, ritmo: s.pace && `${pace(s.pace.fast)}-${pace(s.pace.slow)}` };
  };

  const p = trainingPaces(stats.vdot.vdot);
  const range = (r: { fast: number; slow: number }) => `${pace(r.fast)}-${pace(r.slow)}`;

  const context = {
    hoy: `${today} (${WEEKDAYS[weekday(today)]})`,
    atleta: {
      edad: profile.age, sexo: profile.sex, pesoKg: profile.weightKg, nivel: profile.level,
      fuerzaPorSemana: profile.strengthPerWeek, lesiones: profile.injuries ?? "ninguna",
    },
    disponibilidad: {
      diasDeLaSemana: avail.map((d) => WEEKDAYS[d]),
      diaTiradaLarga: WEEKDAYS[profile.longRunDay],
      fechasNoDisponibles: [...blocked].filter((d) => d >= today && d < end).sort(),
      diasRecientesQueNoPudoEntrenar: [...blocked].filter((d) => d < today && diffDays(today, d) <= 7).sort(),
    },
    fechasLibres: freeDates.map((d) => `${d} ${WEEKDAYS[weekday(d)]}`),
    objetivo: { ...plan.goal, diasRestantes: diffDays(plan.goal.date, today) },
    estado: {
      vdot: +stats.vdot.vdot.toFixed(1),
      ctlForma: +stats.today.ctl.toFixed(1), atlFatiga: +stats.today.atl.toFixed(1), tsbFrescura: +stats.today.tsb.toFixed(1),
      acwr: +stats.acwr.toFixed(2), kmEstaSemana: +stats.totals.weekKm.toFixed(1), mediaKmSemanal6: +stats.totals.avgWeeklyKm6.toFixed(1),
    },
    ritmos: { suave: range(p.easy), maraton: range(p.marathon), umbral: range(p.threshold), intervalos: range(p.interval), repeticiones: range(p.repetition) },
    actividadesUltimos21Dias: db.activities
      .filter((a) => diffDays(today, a.date) <= 21 && a.date <= today)
      .map((a) => ({
        fecha: a.date, deporte: a.sport, nombre: a.name, km: +(a.distanceM / 1000).toFixed(2), min: Math.round(a.movingSec / 60),
        ritmo: a.sport === "run" && a.distanceM > 0 ? pace(a.movingSec / (a.distanceM / 1000)) : undefined,
        fcMedia: a.avgHr, rpe: a.rpe, sensacion: a.feel, comoSeSintio: a.feelings, notas: a.notes,
        sesionPlanificada: planned(a),
      })),
    sesionesNoRealizadas: missed.map((m) => ({ fecha: m.session.date, tipo: m.session.type, titulo: m.session.title, planKm: m.session.distanceKm, hechoKm: +m.doneKm.toFixed(1), estado: m.status })),
    sesionesAAjustar: upcoming.map((s) => {
      const w = weekOf(s.date);
      return {
        id: s.id, date: s.date, dia: WEEKDAYS[weekday(s.date)], fase: w?.phase, semanaDescarga: w?.recovery, type: s.type, title: s.title,
        description: s.description, steps: s.steps, distanceKm: s.distanceKm, durationMin: s.durationMin,
      };
    }),
  };
  return { context, upcoming, freeDates };
}

/** Valida y acota el contenido de una sesión propuesta por la IA frente a la original. */
function applyAi(orig: PlannedSession, ai: AiSession, date: string): PlannedSession {
  const type = TYPES.includes(ai.type as SessionType) ? (ai.type as SessionType) : orig.type;
  // no convertir carrera en fuerza ni al revés: el emparejamiento depende del deporte
  const safeType = (type === "strength") === (orig.type === "strength") ? type : orig.type;
  const isStrength = safeType === "strength";
  const maxKm = Math.max(orig.distanceKm * 1.15, orig.distanceKm + 2);
  const km = Number(ai.distanceKm);
  const min = Number(ai.durationMin);
  const steps = Array.isArray(ai.steps) ? ai.steps.filter((x) => typeof x === "string" && x.trim()).slice(0, 12) : [];
  return {
    ...orig,
    date,
    type: safeType,
    title: ai.title?.trim().slice(0, 80) || orig.title,
    description: [ai.description?.trim() || orig.description, ai.reason?.trim() && `IA: ${ai.reason.trim()}`].filter(Boolean).join(" ").slice(0, 600),
    steps: steps.length ? steps : orig.steps,
    distanceKm: isStrength ? 0 : Number.isFinite(km) && km >= 0 ? Math.round(Math.min(km, maxKm) * 10) / 10 : orig.distanceKm,
    durationMin: Number.isFinite(min) && min > 0 ? Math.round(Math.min(min, Math.max(orig.durationMin * 1.3, 20))) : orig.durationMin,
    // el ritmo calculado solo sigue siendo válido si no cambia el tipo de sesión
    pace: isStrength || safeType !== orig.type ? undefined : orig.pace,
    aiAdjusted: true,
  };
}

// una revisión a la vez por usuario
const running = new Map<string, Promise<CoachResult>>();

export interface CoachResult {
  ok: boolean;
  changed: number;
  message: string;
}

/** Ajusta con IA las sesiones de los próximos 14 días de un usuario. Evita ejecuciones simultáneas. */
export function adaptWithAI(uid: string): Promise<CoachResult> {
  let p = running.get(uid);
  if (!p) {
    p = run(uid).finally(() => running.delete(uid));
    running.set(uid, p);
  }
  return p;
}

/**
 * Revisión automática: si desde la última revisión hay sesiones no realizadas, la IA reprograma.
 * Como mucho una vez al día, para no gastar llamadas en cada visita.
 */
export async function adaptIfMissed(uid: string): Promise<void> {
  if (!coachConfig().configured || running.has(uid)) return;
  const db = await readDbNow(uid);
  if (!db.plan) return;
  const today = todayLocal();
  const last = db.coach?.updatedAt?.slice(0, 10);
  if (last === today) return;
  const matches = matchPlan(db.plan, db.activities, today);
  const newMissed = [...matches.values()].some(
    (m) => m.status === "missed" && m.session.date < today && diffDays(today, m.session.date) <= 7 && (!last || m.session.date >= last),
  );
  if (newMissed) await adaptWithAI(uid);
}

async function run(uid: string): Promise<CoachResult> {
  const { configured, model } = coachConfig();
  if (!configured) return { ok: false, changed: 0, message: "Falta OPENROUTER_API_KEY en .env.local." };
  const today = todayLocal();
  const db = await readDbNow(uid);
  const built = buildContext(db, today);
  if (!built) return { ok: false, changed: 0, message: "No hay plan o sesiones próximas que ajustar." };
  const createdAt = db.plan!.createdAt;

  try {
    const ai = await chatJson<AiResponse>(SYSTEM, JSON.stringify(built.context));
    const byId = new Map((ai.sessions ?? []).filter((s) => s && typeof s.id === "string").map((s) => [s.id, s]));
    let changed = 0;
    await updateDb((d) => {
      changed = 0; // la escritura puede reintentarse
      // si el plan se regeneró mientras la IA pensaba, descartar
      if (!d.plan || d.plan.createdAt !== createdAt) return;
      const allowed = new Set(built.upcoming.map((s) => s.id));
      const free = new Set(built.freeDates);
      const all = d.plan.weeks.flatMap((w) => w.sessions);
      const result: PlannedSession[] = [];
      // las que no cambian ocupan su día; luego se colocan las propuestas por la IA
      const proposals: [PlannedSession, AiSession][] = [];
      for (const s of all) {
        const prop = allowed.has(s.id) ? byId.get(s.id) : undefined;
        if (prop) proposals.push([s, prop]);
        else result.push(s);
      }
      const isRunOn = (date: string, strength: boolean) => result.some((x) => x.date === date && (x.type === "strength") === strength);
      const hardOn = (date: string) => result.some((x) => isHardSession(x.type) && Math.abs(diffDays(x.date, date)) <= 1);
      for (const [s, prop] of proposals) {
        if (prop.remove) {
          changed++;
          continue;
        }
        const strength = s.type === "strength";
        let date = s.date;
        const wanted = typeof prop.date === "string" ? prop.date.slice(0, 10) : s.date;
        if (wanted !== s.date && free.has(wanted) && !isRunOn(wanted, strength)) date = wanted;
        const next = applyAi(s, prop, date);
        // si choca con otra sesión (o pone dos duras seguidas), conservar la fecha original
        if (isRunOn(next.date, strength) || (!strength && isHardSession(next.type) && hardOn(next.date) && next.date !== s.date)) next.date = s.date;
        if (isRunOn(next.date, strength)) {
          result.push(s);
          continue;
        }
        result.push(next);
        changed++;
      }
      for (const w of d.plan.weeks) {
        const end = addDays(w.start, 6);
        w.sessions = result
          .filter((s) => s.date >= w.start && s.date <= end)
          .sort((a, b) => a.date.localeCompare(b.date) || (a.type === "strength" ? 1 : -1));
        w.targetKm = Math.round(w.sessions.reduce((x, y) => x + y.distanceKm, 0));
      }
      d.coach = { updatedAt: new Date().toISOString(), model, summary: ai.summary?.trim().slice(0, 800) || "Plan revisado.", changed };
    }, uid);
    return { ok: true, changed, message: ai.summary ?? "Plan revisado." };
  } catch (e) {
    const message = (e as Error).message;
    await updateDb((d) => {
      d.coach = { ...d.coach, updatedAt: d.coach?.updatedAt ?? new Date().toISOString(), model, summary: d.coach?.summary ?? "", changed: d.coach?.changed ?? 0, error: message };
    }, uid);
    return { ok: false, changed: 0, message: `Error de la IA: ${message}` };
  }
}
