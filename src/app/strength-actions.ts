"use server";
// Fuerza: lugares con su material y ejercicios propios.

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { readDbNow, updateDb } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { adaptWithAI, chatJson, coachConfig, strengthModel } from "@/lib/coach";
import { CHAT_SYSTEM, chatContext, chatEquipment, chatExerciseList, chatHistory, chatReplyFromAi, type AiChatReply } from "@/lib/strength/chat";
import { STRENGTH_SYSTEM, equipmentFromText, routinesFromAi, strengthRequest, type AiStrengthReply } from "@/lib/strength/aiRoutines";
import { todayLocal } from "@/lib/dates";
import { findExercise } from "@/lib/strength/catalog";
import { cleanRoutineExercises, cleanWorkout } from "@/lib/strength/workouts";
import { applyStrengthRoutines, routinesForPlan } from "@/lib/strength/routinePlan";
import type { BodyMeasurement, Db } from "@/lib/types";

/** Tras cambiar las rutinas, las sesiones de fuerza del plan se rehacen con ellas. */
function syncPlanRoutines(d: Db) {
  if (d.plan) applyStrengthRoutines(d.plan, routinesForPlan(d), todayLocal());
}
import { CATEGORIES, EQUIPMENT, MUSCLES, PLACE_PRESETS, type Equipment, type ExerciseCategory, type Muscle } from "@/lib/strength/labels";
import type { FormState } from "./actions";

const EQ_IDS = new Set<string>(EQUIPMENT.map((e) => e.id));
const MUSCLE_IDS = new Set<string>(MUSCLES.map((m) => m.id));
const CAT_IDS = new Set<string>(CATEGORIES.map((c) => c.id));
const MAX_PLACES = 10;
const MAX_CUSTOM = 300;

const text = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);
const equipmentOf = (fd: FormData) => [...new Set(fd.getAll("eq").map(String))].filter((e) => EQ_IDS.has(e)) as Equipment[];
const musclesOf = (fd: FormData, k: string) => [...new Set(fd.getAll(k).map(String))].filter((m) => MUSCLE_IDS.has(m)) as Muscle[];
const newId = (prefix = "") => prefix + crypto.randomUUID().slice(0, 8);

// ---------- Lugares y material ----------

export async function savePlace(_: FormState, fd: FormData): Promise<FormState> {
  const id = text(fd, "id", 20);
  const name = text(fd, "name", 40);
  const equipment = equipmentOf(fd);
  if (!name) return { error: "Ponle un nombre (Casa, Gimnasio…)." };
  if (!equipment.includes("corporal")) equipment.unshift("corporal");
  let error: string | undefined;
  await updateDb((db) => {
    const places = (db.places ??= []);
    const place = { id: id || newId(), name, equipment, notes: text(fd, "notes", 200) || undefined };
    const i = places.findIndex((p) => p.id === id);
    if (i >= 0) places[i] = place;
    else if (places.length >= MAX_PLACES) error = `Como máximo ${MAX_PLACES} lugares.`;
    else {
      places.push(place);
      db.activePlaceId ??= place.id;
    }
  });
  if (error) return { error };
  refresh();
  return { ok: true, message: id ? "Guardado." : "Lugar añadido." };
}

// ---------- Medidas corporales ----------

const MEASURE_FIELDS = ["weightKg", "fatPct", "waistCm", "hipCm", "chestCm", "armCm", "thighCm"] as const;
const MEASURE_RANGE: Record<(typeof MEASURE_FIELDS)[number], [number, number]> = {
  weightKg: [25, 300],
  fatPct: [2, 70],
  waistCm: [40, 200],
  hipCm: [40, 200],
  chestCm: [40, 200],
  armCm: [10, 80],
  thighCm: [20, 120],
};

export async function saveMeasurement(_: FormState, fd: FormData): Promise<FormState> {
  const date = text(fd, "date", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayLocal()) return { error: "Fecha no válida." };
  const m: BodyMeasurement = { date };
  for (const k of MEASURE_FIELDS) {
    const raw = text(fd, k, 10).replace(",", ".");
    if (!raw) continue;
    const n = Number(raw);
    const [lo, hi] = MEASURE_RANGE[k];
    if (!Number.isFinite(n) || n < lo || n > hi) return { error: `Revisa el valor de ${k === "fatPct" ? "% de grasa" : k === "weightKg" ? "peso" : "los perímetros"}.` };
    m[k] = Math.round(n * 10) / 10;
  }
  if (Object.keys(m).length === 1) return { error: "Apunta al menos una medida." };
  await updateDb((db) => {
    const list = (db.measurements ??= []).filter((x) => x.date !== date);
    list.push(m);
    list.sort((a, b) => a.date.localeCompare(b.date));
    db.measurements = list.slice(-1000);
    // el peso más reciente pasa al perfil (cuenta para el peso corporal en fuerza y para la IA)
    const latest = [...list].reverse().find((x) => x.weightKg);
    if (latest?.weightKg && db.profile) db.profile.weightKg = latest.weightKg;
  });
  refresh();
  return { ok: true, message: "Medidas guardadas." };
}

export async function deleteMeasurement(fd: FormData): Promise<void> {
  const date = text(fd, "date", 10);
  await updateDb((db) => {
    db.measurements = (db.measurements ?? []).filter((x) => x.date !== date);
  });
  refresh();
}

export async function addPresetPlace(fd: FormData): Promise<void> {
  const preset = PLACE_PRESETS.find((p) => p.name === fd.get("preset"));
  if (!preset) return;
  await updateDb((db) => {
    const places = (db.places ??= []);
    if (places.length >= MAX_PLACES || places.some((p) => p.name === preset.name)) return;
    const place = { id: newId(), name: preset.name, equipment: [...preset.equipment] };
    places.push(place);
    db.activePlaceId ??= place.id;
  });
  refresh();
}

export async function setActivePlace(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  await updateDb((db) => {
    if (db.places?.some((p) => p.id === id)) db.activePlaceId = id;
  });
  refresh();
}

export async function deletePlace(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  await updateDb((db) => {
    db.places = (db.places ?? []).filter((p) => p.id !== id);
    if (db.activePlaceId === id) db.activePlaceId = db.places[0]?.id;
  });
  refresh();
}

// ---------- Ejercicios propios ----------

export async function saveCustomExercise(_: FormState, fd: FormData): Promise<FormState> {
  const id = text(fd, "id", 20);
  const name = text(fd, "name", 60);
  const cat = String(fd.get("cat") ?? "fuerza");
  const muscles = musclesOf(fd, "muscles");
  const secondary = musclesOf(fd, "secondary").filter((m) => !muscles.includes(m));
  const eq = equipmentOf(fd);
  const steps = text(fd, "steps", 2000)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
  if (name.length < 3) return { error: "Ponle un nombre de al menos 3 letras." };
  if (!CAT_IDS.has(cat)) return { error: "Tipo de ejercicio no válido." };
  if (!muscles.length) return { error: "Marca al menos un músculo principal." };

  let error: string | undefined;
  let savedId = id;
  await updateDb((db) => {
    const list = (db.customExercises ??= []);
    const data = { name, cat: cat as ExerciseCategory, eq: eq.length ? eq : (["corporal"] as Equipment[]), muscles, secondary, steps };
    const i = list.findIndex((x) => x.id === id);
    if (i >= 0) list[i] = { ...list[i], ...data };
    else if (list.length >= MAX_CUSTOM) error = `Como máximo ${MAX_CUSTOM} ejercicios propios.`;
    else {
      savedId = newId("c_");
      list.push({ id: savedId, ...data, createdAt: new Date().toISOString() });
    }
  });
  if (error) return { error };
  redirect(`/fuerza/ejercicios/${savedId}`);
}

export async function deleteCustomExercise(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  await updateDb((db) => {
    db.customExercises = (db.customExercises ?? []).filter((x) => x.id !== id);
  });
  redirect("/fuerza/ejercicios");
}

// ---------- Rutinas ----------

const MAX_ROUTINES = 50;

/** Guarda una rutina desde el editor (llega como objeto, no como formulario). */
export async function saveRoutine(input: { id?: string; name?: string; notes?: string; folder?: string; exercises?: unknown }): Promise<FormState> {
  const db = await readDbNow();
  const name = String(input.name ?? "").trim().slice(0, 60);
  const exercises = cleanRoutineExercises(input.exercises, (id) => Boolean(findExercise(db, id)));
  if (!name) return { error: "Ponle un nombre a la rutina." };
  if (!exercises.length) return { error: "Añade al menos un ejercicio." };

  let id = String(input.id ?? "");
  let error: string | undefined;
  await updateDb((d) => {
    const list = (d.routines ??= []);
    const now = new Date().toISOString();
    const notes = String(input.notes ?? "").trim().slice(0, 300) || undefined;
    const folder = String(input.folder ?? "").trim().slice(0, 30) || undefined;
    const i = list.findIndex((r) => r.id === id);
    if (i >= 0) list[i] = { ...list[i], name, notes, folder, exercises, updatedAt: now };
    else if (list.length >= MAX_ROUTINES) error = `Como máximo ${MAX_ROUTINES} rutinas.`;
    else {
      id = newId("r_");
      list.push({ id, name, notes, folder, exercises, createdAt: now, updatedAt: now });
    }
    syncPlanRoutines(d);
  });
  if (error) return { error };
  redirect(`/fuerza/rutinas/${id}`);
}

export async function duplicateRoutine(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  await updateDb((db) => {
    const src = db.routines?.find((r) => r.id === id);
    if (!src || db.routines!.length >= MAX_ROUTINES) return;
    const now = new Date().toISOString();
    db.routines!.push({ ...structuredClone(src), id: newId("r_"), name: `${src.name} (copia)`.slice(0, 60), createdAt: now, updatedAt: now });
  });
  refresh();
}

export async function deleteRoutine(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  await updateDb((db) => {
    db.routines = (db.routines ?? []).filter((r) => r.id !== id);
    syncPlanRoutines(db);
  });
  redirect("/fuerza");
}

// ---------- Entreno en vivo ----------

/** Guarda el entreno terminado como actividad de fuerza (cuenta en la carga, el plan y el feed). */
export async function finishWorkout(input: {
  name?: string;
  startLocal?: string;
  durationSec?: number;
  rpe?: number;
  feelings?: string;
  workout?: unknown;
}): Promise<FormState> {
  const db = await readDbNow();
  const workout = cleanWorkout(input.workout, (id) => findExercise(db, id)?.name, db.profile?.weightKg);
  const startLocal = String(input.startLocal ?? "");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(startLocal) || startLocal.slice(0, 10) > todayLocal()) return { error: "Fecha del entreno no válida." };
  const durationSec = Math.round(Math.min(Math.max(Number(input.durationSec) || 0, 60), 6 * 3600));
  const rpe = Number(input.rpe);
  const routineName = workout.routineId ? db.routines?.find((r) => r.id === workout.routineId)?.name : undefined;
  const id = `fuerza-${Date.now().toString(36)}`;

  await updateDb((d) => {
    d.activities = [
      ...d.activities,
      {
        id,
        source: "manual" as const,
        name: String(input.name ?? "").trim().slice(0, 80) || routineName || "Entreno de fuerza",
        sport: "strength" as const,
        sportRaw: "strength",
        date: startLocal.slice(0, 10),
        startLocal,
        distanceM: 0,
        movingSec: durationSec,
        elapsedSec: durationSec,
        elevationGainM: 0,
        rpe: rpe >= 1 && rpe <= 10 ? Math.round(rpe) : undefined,
        feelings: String(input.feelings ?? "").trim().slice(0, 1000) || undefined,
        workout,
      },
    ].sort((a, b) => a.startLocal.localeCompare(b.startLocal));
  });
  // la IA reajusta los próximos días con la nueva carga
  if (coachConfig().configured) {
    const uid = await requireUserId();
    after(() => adaptWithAI(uid).then(() => undefined));
  }
  redirect(`/actividad/${id}`);
}

// ---------- Entrenador IA de fuerza ----------

export interface StrengthCoachForm extends FormState {
  routines?: { id: string; name: string }[];
}

/** El atleta cuenta su material y lo que puede hacer; la IA crea sus rutinas para la carrera y el plan las coloca. */
export async function generateStrengthRoutines(_: StrengthCoachForm, fd: FormData): Promise<StrengthCoachForm> {
  const material = text(fd, "material", 600);
  const ability = text(fd, "ability", 1200);
  if (material.length < 3) return { error: "Cuéntale qué material tienes (o «nada, solo mi cuerpo»)." };
  if (!coachConfig().configured) return { error: "La IA no está configurada (falta OPENROUTER_API_KEY)." };
  const now = new Date().toISOString();
  const today = todayLocal();
  const model = strengthModel();
  await updateDb((d) => {
    d.strengthCoach = { ...d.strengthCoach, material, ability, updatedAt: now, model, error: undefined };
  });

  let result: ReturnType<typeof routinesFromAi>;
  let used = model;
  try {
    const db = await readDbNow();
    const request = JSON.stringify(strengthRequest(db, material, ability, today));
    let reply: AiStrengthReply;
    try {
      reply = await chatJson<AiStrengthReply>(STRENGTH_SYSTEM, request, 0.3, model, 3500);
    } catch (e) {
      // sin saldo para el modelo bueno: se intenta con el barato (unas 16 veces menos)
      if ((e as Error).message !== "NO_CREDITS" || model === coachConfig().model) throw e;
      used = coachConfig().model;
      reply = await chatJson<AiStrengthReply>(STRENGTH_SYSTEM, request, 0.3, used, 3500);
    }
    result = routinesFromAi(reply, now, equipmentFromText(material));
    if (!result.routines.length) throw new Error("no propuso ninguna rutina válida con tu material");
  } catch (e) {
    const msg = (e as Error).message;
    const error =
      msg === "NO_CREDITS"
        ? "Tu cuenta de OpenRouter no tiene saldo suficiente. Recarga créditos en openrouter.ai/settings/credits y vuelve a intentarlo."
        : `La IA no pudo crear las rutinas: ${msg}`.slice(0, 300);
    await updateDb((d) => {
      if (d.strengthCoach) d.strengthCoach.error = error;
    });
    return { error };
  }

  await updateDb((d) => {
    // se sustituyen las rutinas de la IA; las del atleta no se tocan
    d.routines = [...(d.routines ?? []).filter((r) => r.source !== "ia"), ...result.routines];
    // su material queda como el lugar «Casa» (y pasa a ser el activo)
    const places = (d.places ??= []);
    const home = places.find((p) => p.name.toLowerCase() === "casa");
    if (home) home.equipment = result.equipment;
    else if (places.length < MAX_PLACES) places.push({ id: newId(), name: "Casa", equipment: result.equipment, notes: material.slice(0, 200) });
    d.activePlaceId = (home ?? places.find((p) => p.name === "Casa"))?.id ?? d.activePlaceId;
    d.strengthCoach = { material, ability, updatedAt: now, model: used, summary: result.summary };
    syncPlanRoutines(d);
  });
  refresh();
  return {
    ok: true,
    message: result.summary || `${result.routines.length} rutinas creadas.`,
    routines: result.routines.map((r) => ({ id: r.id, name: r.name })),
  };
}

// ---------- Chat con el entrenador de fuerza ----------

const MAX_CHAT = 40;

export async function sendStrengthChat(_: FormState, fd: FormData): Promise<FormState> {
  const message = text(fd, "message", 1500);
  if (message.length < 2) return { error: "Escribe tu pregunta." };
  if (!coachConfig().configured) return { error: "La IA no está configurada (falta OPENROUTER_API_KEY)." };
  const now = new Date().toISOString();
  const db = await readDbNow();
  const history = db.strengthChat ?? [];
  const equipment = chatEquipment(db);
  const request = JSON.stringify({
    contexto: chatContext(db, todayLocal()),
    conversacion: chatHistory(history),
    ejerciciosDisponibles: "id | nombre\n" + chatExerciseList(equipment),
    mensaje: message,
  });
  let reply: ReturnType<typeof chatReplyFromAi>;
  try {
    let raw: AiChatReply;
    try {
      raw = await chatJson<AiChatReply>(CHAT_SYSTEM, request, 0.4, strengthModel(), 3000);
    } catch (e) {
      // sin saldo para el modelo bueno: se intenta con el barato
      if ((e as Error).message !== "NO_CREDITS" || strengthModel() === coachConfig().model) throw e;
      raw = await chatJson<AiChatReply>(CHAT_SYSTEM, request, 0.4, coachConfig().model, 3000);
    }
    reply = chatReplyFromAi(raw, equipment, now);
    if (!reply.text) throw new Error("respuesta vacía");
  } catch (e) {
    const msg = (e as Error).message;
    return { error: msg === "NO_CREDITS" ? "Tu cuenta de OpenRouter no tiene saldo suficiente. Recarga créditos en openrouter.ai/settings/credits." : `La IA no ha podido responder: ${msg}`.slice(0, 300) };
  }
  await updateDb((d) => {
    d.strengthChat = [
      ...(d.strengthChat ?? []),
      { role: "user" as const, text: message, at: now },
      { role: "assistant" as const, text: reply.text, at: new Date().toISOString(), ...(reply.routines.length ? { routines: reply.routines } : {}) },
    ].slice(-MAX_CHAT);
  });
  refresh();
  return { ok: true };
}

/** Guarda como rutinas propias las que propuso la IA en un mensaje (carpeta «Entrenador IA»). */
export async function saveChatRoutines(fd: FormData): Promise<void> {
  const at = text(fd, "at", 40);
  await updateDb((d) => {
    const m = d.strengthChat?.find((x) => x.at === at && x.role === "assistant");
    if (!m?.routines?.length || m.saved) return;
    const list = (d.routines ??= []);
    const now = new Date().toISOString();
    for (const r of m.routines) if (list.length < MAX_ROUTINES) list.push({ ...structuredClone(r), id: newId("r_"), createdAt: now, updatedAt: now });
    m.saved = true;
    syncPlanRoutines(d);
  });
  refresh();
}

export async function clearStrengthChat(): Promise<void> {
  await updateDb((d) => {
    d.strengthChat = undefined;
  });
  refresh();
}

