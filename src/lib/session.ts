import "server-only";
// Sesión en una cookie firmada (HMAC): "<userId>.<caducidad>.<firma>".
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "sr_session";
const MAX_AGE_DAYS = 90;

// sin AUTH_SECRET se deriva de un secreto que ya existe en el entorno (token de Redis o key de IA)
function secret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  const base = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.OPENROUTER_API_KEY ?? "statsrun-dev";
  return createHash("sha256").update(`statsrun-session:${base}`).digest("hex");
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

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
  return verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Usuario de la sesión actual; si no hay sesión válida, a /login. */
export async function requireUserId(): Promise<string> {
  const uid = await getUserId();
  if (!uid) redirect("/login");
  return uid;
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
