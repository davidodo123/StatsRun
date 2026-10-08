import "server-only";
// Almacenamiento local en un archivo JSON (app personal de un único atleta).
// Si en el futuro hay varios usuarios, sustituir por Postgres manteniendo esta interfaz.
import { promises as fs } from "node:fs";
import path from "node:path";
import { connection } from "next/server";
import type { Db } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

let writeQueue: Promise<unknown> = Promise.resolve();

export async function readDbNow(): Promise<Db> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const db = JSON.parse(raw) as Db;
    db.activities ??= [];
    return db;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { activities: [] };
    throw e;
  }
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
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db), "utf8");
    await fs.rename(tmp, DB_FILE);
    return db;
  });
  writeQueue = run.catch(() => undefined);
  return run;
}
