// Abre una copia de seguridad (archivo .rio del repo de copias) y, si se pide, la restaura.
//
//   BACKUP_SECRET=… node scripts/backup-restore.mjs copia.rio                 → resumen (claves y tamaños)
//   BACKUP_SECRET=… node scripts/backup-restore.mjs copia.rio --json out.json → todo descifrado a un JSON
//   BACKUP_SECRET=… KV_REST_API_URL=… KV_REST_API_TOKEN=… \
//     node scripts/backup-restore.mjs copia.rio --restaurar [--solo statsrun:db:<id>]  → lo escribe en Redis
//
// Restaurar sobrescribe lo que haya en esas claves: mejor probar antes con --json.
import { createDecipheriv, createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const [file, ...args] = process.argv.slice(2);
const secret = process.env.BACKUP_SECRET;
if (!file || !secret) {
  console.error("Uso: BACKUP_SECRET=… node scripts/backup-restore.mjs copia.rio [--json salida.json | --restaurar [--solo clave]]");
  process.exit(1);
}

// mismo formato que src/lib/backupCrypto.ts: "RIOB1" + iv (12) + etiqueta (16) + datos (AES-256-GCM)
const raw = readFileSync(file);
if (raw.subarray(0, 5).toString() !== "RIOB1") throw new Error("No es una copia de Run-In-Out.");
const d = createDecipheriv("aes-256-gcm", createHash("sha256").update(secret).digest(), raw.subarray(5, 17));
d.setAuthTag(raw.subarray(17, 33));
const backup = JSON.parse(gunzipSync(Buffer.concat([d.update(raw.subarray(33)), d.final()])).toString());

const only = args.includes("--solo") ? args[args.indexOf("--solo") + 1] : undefined;
const entries = Object.entries(backup.keys).filter(([k]) => !only || k === only);
console.log(`Copia del ${backup.createdAt}: ${Object.keys(backup.keys).length} claves`);
for (const [k, v] of entries) console.log(`  ${k}  ${(v.length / 1024).toFixed(1)} KB`);

if (args.includes("--json")) {
  writeFileSync(args[args.indexOf("--json") + 1], JSON.stringify(backup, null, 2));
  console.log("Guardada descifrada en", args[args.indexOf("--json") + 1]);
}

if (args.includes("--restaurar")) {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Faltan KV_REST_API_URL y KV_REST_API_TOKEN para restaurar.");
  for (const [k, v] of entries) {
    if (k.startsWith("archivo:")) continue; // copias hechas en local
    // como kvSet: valor y contador de versión (para que nadie sobrescriba con datos viejos)
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["EVAL", "redis.call('SET', KEYS[1], ARGV[1]) redis.call('INCR', KEYS[2]) return 1", "2", k, `${k}:v`, v]),
    });
    if (!res.ok) throw new Error(`Redis ${res.status} en ${k}`);
  }
  console.log(`Restauradas ${entries.length} claves.`);
}
