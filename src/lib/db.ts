import "server-only";
// Almacenamiento de la app personal de un único atleta: todo el Db como un JSON.
// - Con Redis (Upstash, p. ej. desde el Marketplace de Vercel) si hay credenciales REST: necesario en Vercel,
//   cuyo disco es de solo lectura y no persiste.
// - Si no, en un archivo local data/db.json.
// Si en el futuro hay varios usuarios, sustituir por Postgres manteniendo esta interfaz.
import { promises as fs } from "node:fs";
import path from "node:path";
import { connection } from "next/server";
import type { Db } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const REDIS_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_KEY = process.env.DB_KEY ?? "statsrun:db";

let writeQueue: Promise<unknown> = Promise.resolve();

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

async function readRaw(): Promise<string | undefined> {
  if (REDIS_URL && REDIS_TOKEN) return ((await redis(["GET", REDIS_KEY])) as string | null) ?? undefined;
  try {
    return await fs.readFile(DB_FILE, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw e;
  }
}

async function writeRaw(json: string): Promise<void> {
  if (REDIS_URL && REDIS_TOKEN) {
    await redis(["SET", REDIS_KEY, json]);
    return;
  }
  if (process.env.VERCEL) throw new Error("En Vercel hace falta una base de datos Redis (Upstash): conéctala en Storage y vuelve a desplegar.");
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  await fs.writeFile(tmp, json, "utf8");
  await fs.rename(tmp, DB_FILE);
}

export async function readDbNow(): Promise<Db> {
  const raw = await readRaw();
  if (!raw) return { activities: [] };
  const db = JSON.parse(raw) as Db;
  db.activities ??= [];
  return db;
}

/** Lectura para renderizado: espera a la petición (datos siempre frescos). */
export async function getDb(): Promise<Db> {
  await connection();
  return readDbNow();
}

/** Modificación atómica y serializada del archivo. */
export function updateDb(fn: (db: Db) => void | Promise<void>): Promise<Db> {
  const run = writeQueue.then(async () => {
    const db = await readDbNow();
    await fn(db);
    await writeRaw(JSON.stringify(db));
    return db;
  });
  writeQueue = run.catch(() => undefined);
  return run;
}
