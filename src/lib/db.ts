import "server-only";
// Almacenamiento: un documento JSON por usuario (su Db) más la lista de usuarios.
// - Con Redis (Upstash, p. ej. desde el Marketplace de Vercel) si hay credenciales REST: necesario en Vercel,
//   cuyo disco es de solo lectura y no persiste.
// - Si no, en archivos locales dentro de data/.
import { promises as fs } from "node:fs";
import path from "node:path";
import { connection } from "next/server";
import { cache } from "react";
import type { Db } from "./types";
import { requireUserId } from "./session";

const DATA_DIR = path.join(process.cwd(), "data");

const REDIS_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const PREFIX = process.env.DB_KEY ?? "statsrun:db";

async function redis(command: string[]): Promise<unknown> {
  const res = await fetch(REDIS_URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const json = (await res.json()) as { result?: unknown; error?: string };
  if (!res.ok || json.error) throw new Error(`Redis: ${json.error ?? res.status}`);
  return json.result;
}

const redisEnabled = () => Boolean(REDIS_URL && REDIS_TOKEN);
// nombre de archivo local seguro a partir de la clave
const fileFor = (key: string) => path.join(DATA_DIR, `${key.replace(/^statsrun:/, "").replace(/[^\w-]/g, "_")}.json`);

/** Lee un documento JSON crudo por clave. */
export async function kvGet(key: string): Promise<string | undefined> {
  if (redisEnabled()) return ((await redis(["GET", key])) as string | null) ?? undefined;
  try {
    return await fs.readFile(fileFor(key), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw e;
  }
}

/** Escribe un documento JSON crudo por clave. */
export async function kvSet(key: string, json: string): Promise<void> {
  if (redisEnabled()) {
    await redis(["EVAL", "redis.call('SET', KEYS[1], ARGV[1]) redis.call('INCR', KEYS[2]) return 1", "2", key, `${key}:v`, json]);
    return;
  }
  if (process.env.VERCEL) throw new Error("En Vercel hace falta una base de datos Redis (Upstash): conéctala en Storage y vuelve a desplegar.");
  await fs.mkdir(DATA_DIR, { recursive: true });
  const file = fileFor(key);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, json, "utf8");
  await fs.rename(tmp, file);
}

/** Borra un documento (y su contador de versión). */
export async function kvDel(key: string): Promise<void> {
  if (redisEnabled()) {
    await redis(["DEL", key, `${key}:v`]);
    return;
  }
  await fs.rm(fileFor(key), { force: true });
}

/** Clave del Db de un usuario. La clave sin usuario es la del modo de un solo atleta (anterior a las cuentas). */
export const userDbKey = (uid: string) => `${PREFIX}:${uid}`;
export const LEGACY_DB_KEY = PREFIX;

// colas de escritura por clave: serializan las modificaciones dentro de una misma instancia
const queues = new Map<string, Promise<unknown>>();

function serialize<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const run = (queues.get(key) ?? Promise.resolve()).then(fn);
  queues.set(key, run.catch(() => undefined));
  return run;
}

// Entre instancias (Vercel) las colas no bastan: cada documento lleva un contador de versión en "<clave>:v"
// y la escritura solo se aplica si nadie lo ha cambiado desde la lectura; si no, se relee y se reintenta.
const CAS_SCRIPT = `local v = redis.call('GET', KEYS[2])
if (v or '') ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
redis.call('INCR', KEYS[2])
return 1`;

/** Modificación serializada (y atómica entre instancias con Redis) de un documento JSON. */
export function kvUpdate<T>(key: string, empty: () => T, fn: (doc: T) => void | Promise<void>): Promise<T> {
  return serialize(key, async () => {
    if (!redisEnabled()) {
      const raw = await kvGet(key);
      const doc = raw ? (JSON.parse(raw) as T) : empty();
      await fn(doc);
      await kvSet(key, JSON.stringify(doc));
      return doc;
    }
    for (let attempt = 0; attempt < 8; attempt++) {
      const [raw, version] = (await redis(["MGET", key, `${key}:v`])) as [string | null, string | null];
      const doc = raw ? (JSON.parse(raw) as T) : empty();
      await fn(doc);
      if (await redis(["EVAL", CAS_SCRIPT, "2", key, `${key}:v`, version ?? "", JSON.stringify(doc)])) return doc;
      await new Promise((r) => setTimeout(r, 20 + Math.random() * 80 * (attempt + 1)));
    }
    throw new Error("Demasiadas escrituras a la vez: vuelve a intentarlo.");
  });
}

function parseDb(raw: string | undefined): Db {
  if (!raw) return { activities: [] };
  const db = JSON.parse(raw) as Db;
  db.activities ??= [];
  return db;
}

/** Lee el Db de un usuario (por defecto, el de la sesión actual). */
export async function readDbNow(uid?: string): Promise<Db> {
  return parseDb(await kvGet(userDbKey(uid ?? (await requireUserId()))));
}

// una sola lectura por usuario y petición aunque varios componentes pidan sus datos
const readDbForRender = cache(async (uid: string) => readDbNow(uid));

/** Lectura para renderizado: espera a la petición (datos siempre frescos) y se comparte dentro de ella. */
export async function getDb(uid?: string): Promise<Db> {
  await connection();
  return readDbForRender(uid ?? (await requireUserId()));
}

/** Modificación atómica y serializada del Db de un usuario (por defecto, el de la sesión actual). */
export async function updateDb(fn: (db: Db) => void | Promise<void>, uid?: string): Promise<Db> {
  const id = uid ?? (await requireUserId());
  return kvUpdate<Db>(userDbKey(id), () => ({ activities: [] }), async (db) => {
    db.activities ??= [];
    await fn(db);
  });
}
