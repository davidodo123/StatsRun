// Recorre la app con los usuarios de prueba (scripts/pruebas/usuarios.ts) contra `npx next start -p 3005`
// y apunta lo que falla: errores del servidor, la pantalla «Algo ha fallado», textos rotos (NaN, undefined…) y lentitud.
//
//   node scripts/pruebas/recorrido.mjs <informe.json> [usuarios=1000] [a la vez=8]
import { createHash, createHmac } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const [OUT = "informe-recorrido.json", MAX = "1000", PAR = "8"] = process.argv.slice(2);
const BASE = process.env.BASE ?? "http://localhost:3005";

// cookie de sesión firmada como src/lib/session.ts (el secreto, de .env.local; no se imprime)
const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const base = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN ?? env.GOOGLE_CLIENT_SECRET ?? env.OPENROUTER_API_KEY;
const secret = env.AUTH_SECRET || createHash("sha256").update(`statsrun-session:${base ?? "statsrun-dev"}`).digest("hex");
const cookieFor = (uid) => {
  const payload = `${uid}.${Math.floor(Date.now() / 1000) + 86400}`;
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
};

const ids = readdirSync("data")
  .filter((f) => /^db_prueba-\d+\.json$/.test(f))
  .map((f) => f.slice(3, -5))
  .sort()
  .slice(0, Number(MAX));

// texto visible roto: fuera de scripts y del JSON de React (ahí «undefined» es normal)
const BROKEN = [/>[^<]*\bNaN\b[^<]*</, />[^<]*\bundefined\b[^<]*</, />[^<]*Invalid Date[^<]*</, />[^<]*\[object Object\][^<]*</, />[^<]*\bInfinity\b[^<]*</];
const visible = (html) => html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");

function pagesFor(id) {
  const db = JSON.parse(readFileSync(`data/db_${id}.json`, "utf8"));
  const act = db.activities?.[0]?.id;
  const run = db.activities?.find((a) => a.sport === "run")?.id;
  const pages = ["/", "/plan", "/plan/actual", "/fuerza", "/perfil", "/perfil?tab=running", "/perfil?tab=fuerza", "/perfil?tab=actividades", "/perfil?tab=salud", "/registrar", "/estadisticas", "/amigos", "/entrenador", "/carreras", "/sueno"];
  if (act) pages.push(`/actividad/${encodeURIComponent(act)}`);
  if (run && run !== act) pages.push(`/actividad/${encodeURIComponent(run)}`);
  return { db, pages };
}

const problems = [];
const times = [];
let done = 0;
const t0 = Date.now();

async function visit(id) {
  const { db, pages } = pagesFor(id);
  const headers = { cookie: `sr_session=${cookieFor(id)}; rio_lang=${db.lang ?? "es"}` };
  for (const page of pages) {
    const t = Date.now();
    let res;
    let html = "";
    try {
      res = await fetch(BASE + page, { headers, redirect: "manual" });
      html = await res.text();
    } catch (e) {
      problems.push({ id, page, kind: "sin-respuesta", detail: e.message });
      continue;
    }
    const ms = Date.now() - t;
    times.push({ id, page, ms });
    const loc = res.headers.get("location") ?? "";
    if (res.status >= 300 && res.status < 400) {
      // sin perfil se va a /perfil: normal; a /login, la sesión no vale
      if (loc.includes("/login")) problems.push({ id, page, kind: "redirige-a-login", detail: loc });
      continue;
    }
    if (res.status >= 500) problems.push({ id, page, kind: `http-${res.status}`, detail: html.slice(0, 200) });
    else if (res.status === 404 && !page.startsWith("/actividad")) problems.push({ id, page, kind: "http-404", detail: "" });
    else if (res.status !== 200 && res.status !== 404) problems.push({ id, page, kind: `http-${res.status}`, detail: "" });
    const v = visible(html);
    if (/Algo ha fallado|Something went wrong|Alguna cosa ha fallat|Algo correu mal|Un problème est survenu/.test(v)) problems.push({ id, page, kind: "pantalla-de-error", detail: (html.match(/"digest":"([^"]+)"/) ?? [])[1] ?? "" });
    for (const re of BROKEN) {
      const m = v.match(re);
      if (m) problems.push({ id, page, kind: "texto-roto", detail: m[0].slice(0, 160) });
    }
    if (ms > 4000) problems.push({ id, page, kind: "lenta", detail: `${ms} ms` });
  }
  if (++done % 50 === 0) console.log(`${done}/${ids.length} usuarios · ${problems.length} problemas · ${Math.round((Date.now() - t0) / 1000)} s`);
}

const queue = [...ids];
await Promise.all(Array.from({ length: Number(PAR) }, async () => {
  while (queue.length) await visit(queue.shift());
}));

const byKind = {};
for (const p of problems) {
  const key = `${p.kind} ${p.page.replace(/\/actividad\/.*/, "/actividad/…").replace(/\?.*/, (q) => q)}`;
  const b = (byKind[key] ??= { n: 0, ejemplos: [] });
  b.n++;
  if (b.ejemplos.length < 4) b.ejemplos.push({ id: p.id, detail: p.detail });
}
times.sort((a, b) => b.ms - a.ms);
const avg = Math.round(times.reduce((t, x) => t + x.ms, 0) / Math.max(1, times.length));
const byPage = {};
for (const x of times) {
  const k = x.page.replace(/\/actividad\/.*/, "/actividad/…");
  (byPage[k] ??= []).push(x.ms);
}
const pageStats = Object.fromEntries(Object.entries(byPage).map(([k, v]) => [k, { media: Math.round(v.reduce((a, b) => a + b, 0) / v.length), max: Math.max(...v) }]));
writeFileSync(OUT, JSON.stringify({ usuarios: ids.length, paginas: times.length, segundos: Math.round((Date.now() - t0) / 1000), mediaMs: avg, porPagina: pageStats, problemas: byKind, masLentas: times.slice(0, 10) }, null, 2));
console.log(`Hecho: ${ids.length} usuarios, ${times.length} páginas en ${Math.round((Date.now() - t0) / 1000)} s (media ${avg} ms) · ${problems.length} problemas`);
for (const [k, b] of Object.entries(byKind).sort((a, b) => b[1].n - a[1].n)) console.log(`  ${k}: ${b.n}`);
