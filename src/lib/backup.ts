import "server-only";
// Copias de seguridad: todo lo guardado (usuarios, datos de cada uno, fotos…), comprimido y cifrado,
// a un repositorio privado de GitHub. Las lanza cada noche el cron de Vercel (/api/cron/backup).
import { promises as fs } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { encryptBackup } from "./backupCrypto";

const REDIS_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const KEEP_DAYS = 30;

async function redis(command: (string | number)[]): Promise<unknown> {
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

/** Todas las claves de la app con su valor (sin los contadores de versión, que se rehacen al restaurar). */
async function dumpAll(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!REDIS_URL || !REDIS_TOKEN) {
    // en local, los archivos de data/ (con su nombre de archivo como clave)
    const dir = path.join(process.cwd(), "data");
    for (const f of await fs.readdir(dir).catch(() => [] as string[]))
      if (f.endsWith(".json")) out[`archivo:${f}`] = await fs.readFile(path.join(dir, f), "utf8");
    return out;
  }
  const keys: string[] = [];
  let cursor = "0";
  do {
    const [next, batch] = (await redis(["SCAN", cursor, "MATCH", "statsrun:*", "COUNT", 500])) as [string, string[]];
    cursor = next;
    keys.push(...batch.filter((k) => !k.endsWith(":v")));
  } while (cursor !== "0");
  for (let i = 0; i < keys.length; i += 100) {
    const chunk = keys.slice(i, i + 100);
    const values = (await redis(["MGET", ...chunk])) as (string | null)[];
    chunk.forEach((k, j) => values[j] !== null && (out[k] = values[j]!));
  }
  return out;
}

export interface BackupResult {
  file: string;
  keys: number;
  bytes: number;
  deleted: number;
}

const gh = (p: string, init: RequestInit = {}) =>
  fetch(`https://api.github.com/repos/${process.env.GITHUB_BACKUP_REPO}/${p}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.GITHUB_BACKUP_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...init.headers },
    cache: "no-store",
  });

async function putFile(file: string, content: Buffer, message: string) {
  // si ya existe (p. ej. se lanza dos veces el mismo día), hace falta su sha para sustituirlo
  const prev = await gh(`contents/${file}`);
  const sha = prev.ok ? ((await prev.json()) as { sha: string }).sha : undefined;
  const res = await gh(`contents/${file}`, { method: "PUT", body: JSON.stringify({ message, content: content.toString("base64"), sha }) });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** Copia del día en diarias/ (y la del día 1 también en mensuales/); borra las diarias de más de 30 días y las mensuales de más de un año. */
export async function runBackup(now = new Date()): Promise<BackupResult> {
  const secret = process.env.BACKUP_SECRET;
  if (!secret || !process.env.GITHUB_BACKUP_TOKEN || !process.env.GITHUB_BACKUP_REPO) throw new Error("Faltan BACKUP_SECRET, GITHUB_BACKUP_TOKEN o GITHUB_BACKUP_REPO.");
  const data = await dumpAll();
  const day = now.toISOString().slice(0, 10);
  const plain = gzipSync(JSON.stringify({ version: 1, createdAt: now.toISOString(), keys: data }));
  const enc = encryptBackup(plain, secret);
  const n = Object.keys(data).length;
  await putFile(`diarias/${day}.rio`, enc, `Copia ${day} (${n} claves)`);
  if (day.endsWith("-01")) await putFile(`mensuales/${day.slice(0, 7)}.rio`, enc, `Copia mensual ${day.slice(0, 7)}`);

  // las diarias de hace más de 30 días y las mensuales de hace más de 12 meses se borran
  // (así lo que alguien borra de su cuenta desaparece también de las copias)
  let deleted = 0;
  const limits: [string, string][] = [
    ["diarias", new Date(now.getTime() - KEEP_DAYS * 864e5).toISOString().slice(0, 10)],
    ["mensuales", new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1)).toISOString().slice(0, 7)],
  ];
  for (const [dir, limit] of limits) {
    const list = await gh(`contents/${dir}`);
    if (!list.ok) continue;
    for (const f of (await list.json()) as { name: string; path: string; sha: string }[]) {
      if (f.name.slice(0, limit.length) >= limit) continue;
      const res = await gh(`contents/${f.path}`, { method: "DELETE", body: JSON.stringify({ message: `Borrar copia antigua ${f.name}`, sha: f.sha }) });
      if (res.ok) deleted++;
    }
  }
  return { file: `diarias/${day}.rio`, keys: n, bytes: enc.length, deleted };
}
