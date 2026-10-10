"use server";
// Fuerza: lugares con su material y ejercicios propios.

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { updateDb } from "@/lib/db";
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
