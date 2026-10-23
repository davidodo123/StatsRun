import "server-only";
// Sesión en una cookie firmada (HMAC): "<userId>.<caducidad>.<firma>".
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";

export const SESSION_COOKIE = "sr_session";
// identidad de Google pendiente de enlazar con una cuenta antigua o de crear cuenta nueva
export const GOOGLE_PENDING_COOKIE = "sr_google";
const MAX_AGE_DAYS = 90;

// sin AUTH_SECRET se deriva de un secreto que ya existe en el entorno (token de Redis, cliente de Google o key de IA).
// En producción nunca se usa un valor conocido: con él cualquiera podría falsificar la sesión de otro usuario.
function secret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  const base =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.GOOGLE_CLIENT_SECRET ?? process.env.OPENROUTER_API_KEY;
  if (!base && process.env.NODE_ENV === "production") throw new Error("Falta AUTH_SECRET en las variables de entorno.");
  return createHash("sha256").update(`statsrun-session:${base ?? "statsrun-dev"}`).digest("hex");
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

/** Empaqueta un valor firmado y con caducidad (para cookies temporales). */
export function sealValue(value: unknown, maxAgeSec: number): string {
  const payload = Buffer.from(JSON.stringify({ v: value, exp: Math.floor(Date.now() / 1000) + maxAgeSec })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function unsealValue<T>(token: string | undefined): T | undefined {
  const [payload, sig] = token?.split(".") ?? [];
  if (!payload || !sig) return undefined;
  const expected = Buffer.from(sign(payload));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return undefined;
  const { v, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { v: T; exp: number };
  return exp >= Date.now() / 1000 ? v : undefined;
}

export function createToken(uid: string): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_DAYS * 86400;
  const payload = `${uid}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined): string | undefined {
  if (!token) return undefined;
  const parts = token.split(".");
  if (parts.length !== 3) return undefined;
  const [uid, exp, sig] = parts;
  const expected = Buffer.from(sign(`${uid}.${exp}`));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return undefined;
  if (Number(exp) < Date.now() / 1000) return undefined;
  return uid;
}

/** Usuario de la sesión actual, o undefined. */
export async function getUserId(): Promise<string | undefined> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  // la caducidad se comprueba con la hora actual: solo con una petición real, no al prerenderizar
  await connection();
  return verifyToken(token);
}

/** Usuario de la sesión actual; si no hay sesión válida, a /login. */
export async function requireUserId(): Promise<string> {
  const uid = await getUserId();
  if (!uid) redirect("/login");
  return uid;
}

/**
 * Para pintar páginas: el usuario de la sesión, en la caché privada (solo en el navegador, por sesión).
 * Así la precarga de los enlaces ya lleva la página con sus datos y la navegación es instantánea.
 * Las acciones y las rutas de API usan requireUserId (siempre en directo).
 */
async function viewerId(): Promise<string | undefined> {
  "use cache: private";
  viewCache();
  return verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireViewerId(): Promise<string> {
  const uid = await viewerId();
  if (!uid) redirect("/login");
  return uid;
}

/**
 * Cuánto guarda el navegador una página ya vista o precargada: 5 min es el mínimo para que la precarga la incluya.
 * Cualquier acción que guarda datos (con refresh() o redirect) vacía esa caché al momento.
 */
const VIEW_CACHE = { stale: 300, revalidate: 300, expire: 3600 };
/** Etiqueta de todo lo que se lee para pintar: updateDb la vacía al guardar (si no, el navegador seguiría con lo de antes). */
export const VIEW_TAG = "vista";

/** Dentro de una función con "use cache: private": la caché de las páginas (ver VIEW_CACHE). */
export function viewCache() {
  cacheLife(VIEW_CACHE);
  cacheTag(VIEW_TAG);
}

export async function startSession(uid: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, createToken(uid), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_DAYS * 86400,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
