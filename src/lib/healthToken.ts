import "server-only";
// Clave personal para el atajo de Salud: se enseña una sola vez y solo se guarda su hash.
import { createHash, randomBytes } from "node:crypto";
import { healthTokenKey, kvDel, kvGet, kvSet, updateDb } from "./db";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Crea una clave nueva para el usuario (la anterior deja de funcionar) y la devuelve en claro. */
export async function createHealthToken(uid: string): Promise<string> {
  const token = `rio_${randomBytes(24).toString("base64url")}`;
  const h = hash(token);
  let old: string | undefined;
  await updateDb((db) => {
    old = db.healthTokenHash;
    db.healthTokenHash = h;
  }, uid);
  await kvSet(healthTokenKey(h), JSON.stringify(uid));
  if (old && old !== h) await kvDel(healthTokenKey(old));
  return token;
}

export async function revokeHealthToken(uid: string): Promise<void> {
  let old: string | undefined;
  await updateDb((db) => {
    old = db.healthTokenHash;
    delete db.healthTokenHash;
  }, uid);
  if (old) await kvDel(healthTokenKey(old));
}

/** Usuario dueño de la clave, o undefined si no existe o se ha cambiado. */
export async function userForHealthToken(token: string): Promise<string | undefined> {
  if (!/^rio_[\w-]{20,64}$/.test(token)) return undefined;
  const raw = await kvGet(healthTokenKey(hash(token)));
  return raw ? (JSON.parse(raw) as string) : undefined;
}
