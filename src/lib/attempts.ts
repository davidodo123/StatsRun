import "server-only";
// Freno contra probar contraseñas o mandar correos sin parar: intentos recientes por correo (guardados con un resumen, no el correo).
import { createHash } from "node:crypto";
import { kvDel, kvGet, kvSet } from "./db";

const keyOf = (kind: string, id: string) => `statsrun:intentos:${kind}:${createHash("sha256").update(id.trim().toLowerCase()).digest("hex").slice(0, 32)}`;

async function recent(key: string, windowMs: number): Promise<number[]> {
  const raw = await kvGet(key);
  const now = Date.now();
  return raw ? (JSON.parse(raw) as number[]).filter((t) => now - t < windowMs) : [];
}

/** ¿Ha llegado al máximo de intentos en la ventana? */
export async function tooMany(kind: string, id: string, max: number, windowMs: number): Promise<boolean> {
  return (await recent(keyOf(kind, id), windowMs)).length >= max;
}

/** Apunta un intento (fallido, o un correo mandado). */
export async function noteAttempt(kind: string, id: string, windowMs: number): Promise<void> {
  const key = keyOf(kind, id);
  await kvSet(key, JSON.stringify([...(await recent(key, windowMs)), Date.now()]));
}

export const clearAttempts = (kind: string, id: string) => kvDel(keyOf(kind, id));
