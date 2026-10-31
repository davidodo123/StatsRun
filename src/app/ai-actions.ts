"use server";
import { say } from "@/lib/i18n/server";
// Memoria de la IA: valorar sus respuestas y gestionar lo que recuerda del atleta.

import { refresh } from "next/cache";
import { updateDb } from "@/lib/db";
import { MAX_FEEDBACK, addPreferences, cleanPreference } from "@/lib/aiMemory";
import type { AiArea, AiPreference } from "@/lib/types";
import type { FormState } from "./actions";

const AREAS: AiArea[] = ["plan", "fuerza", "chat"];
const newId = () => crypto.randomUUID().slice(0, 8);
const text = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);

/** Pulgar arriba o abajo a una respuesta; con pulgar abajo y motivo, el motivo pasa a ser una preferencia. */
export async function rateAi(_: FormState, fd: FormData): Promise<FormState> {
  const area = text(fd, "area", 10) as AiArea;
  const ref = text(fd, "ref", 40);
  const rating: 1 | -1 | 0 = fd.get("rating") === "1" ? 1 : fd.get("rating") === "-1" ? -1 : 0;
  const reason = cleanPreference(fd.get("reason"));
  if (!AREAS.includes(area) || !ref || !rating) return { error: await say("Valoración no válida.") };
  const at = new Date().toISOString();
  await updateDb((db) => {
    // copia de lo valorado: servirá de ejemplo bueno o malo
    const response =
      area === "plan" ? db.coach?.summary : area === "fuerza" ? db.strengthCoach?.summary : db.strengthChat?.find((m) => m.at === ref && m.role === "assistant")?.text;
    db.aiFeedback = [...(db.aiFeedback ?? []).filter((f) => !(f.area === area && f.ref === ref)), { at, area, ref, rating: rating as 1 | -1, ...(reason ? { reason } : {}), ...(response ? { response: response.slice(0, 1500) } : {}) }].slice(-MAX_FEEDBACK);
    if (rating === -1 && reason)
      db.aiPreferences = addPreferences(db.aiPreferences, [{ text: reason, area: area === "plan" ? "plan" : "fuerza", source: "valoracion", at }], newId);
  });
  refresh();
  return { ok: true, message: rating === 1 ? "Gracias." : reason ? "Apuntado: lo tendrá en cuenta." : "Gracias. Si nos dices qué falló, lo recordará." };
}

export async function addAiPreference(_: FormState, fd: FormData): Promise<FormState> {
  const t = cleanPreference(fd.get("text"));
  const area = (["todas", "plan", "fuerza"].includes(String(fd.get("area"))) ? fd.get("area") : "todas") as AiPreference["area"];
  if (t.length < 3) return { error: await say("Escribe la preferencia (p. ej. «No quiero zancadas»).") };
  const at = new Date().toISOString();
  let dup = false;
  await updateDb((db) => {
    db.aiPreferences = addPreferences(db.aiPreferences, [{ text: t, area, source: "manual", at }], newId);
    dup = !db.aiPreferences.some((p) => p.at === at);
  });
  if (dup) return { error: await say("Ya la tenía apuntada.") };
  refresh();
  return { ok: true, message: "Apuntado." };
}

export async function deleteAiPreference(fd: FormData): Promise<void> {
  const id = text(fd, "id", 20);
  await updateDb((db) => {
    db.aiPreferences = (db.aiPreferences ?? []).filter((p) => p.id !== id);
  });
  refresh();
}
