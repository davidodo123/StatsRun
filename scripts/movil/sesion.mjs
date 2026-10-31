// Cookie de sesión (sr_session) de un usuario LOCAL, para probar la app en `next start` sin pasar por el login.
// Firma igual que src/lib/session.ts con el secreto de .env.local. No imprime ningún secreto: escribe la cookie en un archivo.
//
//   node scripts/movil/sesion.mjs <id del usuario> <archivo de salida>     p. ej. preview-demo o demo-video-lucia
import { createHash, createHmac } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const [uid, out] = process.argv.slice(2);
if (!uid || !out) throw new Error("Uso: node scripts/movil/sesion.mjs <usuario> <archivo>");

const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const base = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN ?? env.GOOGLE_CLIENT_SECRET ?? env.OPENROUTER_API_KEY;
const secret = env.AUTH_SECRET || createHash("sha256").update(`statsrun-session:${base ?? "statsrun-dev"}`).digest("hex");
const payload = `${uid}.${Math.floor(Date.now() / 1000) + 86400}`; // vale un día
writeFileSync(out, `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`);
console.log(`cookie de ${uid} en ${out}`);
