// Prueba las acciones (guardar formularios) con los usuarios de prueba (scripts/pruebas/usuarios.ts) contra `npx next start -p 3005`:
// cada usuario registra un entreno, una medida, salta una sesión y lo deshace, bloquea y libera un día, rehace el plan,
// guarda un entreno de fuerza y borra el entreno; además manda 5 medidas a la vez (no se debe perder ninguna).
// Después se lee el Db de cada uno y se comprueba que quedó como debe.
//
//   npm run build && OPENROUTER_API_KEY= npx next start -p 3005
//   node scripts/pruebas/acciones.mjs <informe.json> [usuarios=1000] [a la vez=8]
import { createHash, createHmac } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const [OUT = "informe-acciones.json", MAX = "1000", PAR = "8"] = process.argv.slice(2);
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

// id de cada acción y una página donde está cargada, del manifiesto del build
const manifest = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8")).node;
const ACTIONS = {};
for (const [id, v] of Object.entries(manifest)) {
  const page = Object.keys(v.workers).find((w) => w.endsWith("/page") && !w.includes("["));
  if (!page || !v.exportedName) continue;
  // «app/(app)/plan/actual/page» → «/plan/actual»
  const path = "/" + page.replace(/^app\//, "").replace(/(^|\/)page$/, "").replace(/\([^)]+\)\/?/g, "").replace(/\/$/, "");
  ACTIONS[`${v.filename}#${v.exportedName}`] = { id, path };
}

const fd = (o) => Object.entries(o);
/** Llama a una acción como el navegador (formato de React: los FormData van como «$K1» y sus campos con «1_»). */
async function call(uid, name, args) {
  const a = ACTIONS[name];
  if (!a) throw new Error(`acción no encontrada en el build: ${name}`);
  const headers = { "Next-Action": a.id, Accept: "text/x-component", Origin: BASE, cookie: `sr_session=${cookieFor(uid)}; rio_lang=es` };
  let body;
  const form = args.findIndex((x) => Array.isArray(x) && x.every((e) => Array.isArray(e) && e.length === 2) && x.__form);
  if (form >= 0) {
    body = new FormData();
    for (const [k, v] of args[form]) body.append(`_1_${k}`, String(v));
    body.append("0", JSON.stringify(args.map((x, i) => (i === form ? "$K1" : x))));
  } else {
    body = JSON.stringify(args);
    headers["Content-Type"] = "text/plain;charset=UTF-8";
  }
  const t = Date.now();
  const res = await fetch(BASE + a.path, { method: "POST", headers, body, redirect: "manual" });
  const text = await res.text();
  return { status: res.status, text, ms: Date.now() - t, redirect: res.headers.get("x-action-redirect") };
}
const form = (o) => Object.assign(fd(o), { __form: true });

const ids = readdirSync("data")
  .filter((f) => /^db_prueba-\d+\.json$/.test(f))
  .map((f) => f.slice(3, -5))
  .sort()
  .slice(0, Number(MAX));

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const now = new Date();
const today = ymd(now);
const dayOff = (n) => ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n));
const readDb = (id) => JSON.parse(readFileSync(`data/db_${id}.json`, "utf8"));

const problems = [];
const times = [];
let done = 0;
const t0 = Date.now();

async function step(id, label, name, args, expect = {}) {
  let r;
  try {
    r = await call(id, name, args);
  } catch (e) {
    problems.push({ id, step: label, kind: "sin-respuesta", detail: e.message });
    return undefined;
  }
  times.push(r.ms);
  if (r.status >= 500 || /"digest":"/.test(r.text)) problems.push({ id, step: label, kind: "error-servidor", detail: `${r.status} ${r.text.slice(0, 200)}` });
  else if (r.status !== 200 && r.status !== 303) problems.push({ id, step: label, kind: "estado", detail: String(r.status) });
  // un FormState con error: la acción rechazó datos que la app sí manda
  const err = r.text.match(/"error":"(?!\$)([^"]{0,160})/);
  if (err && !expect.error) problems.push({ id, step: label, kind: "rechazado", detail: err[1] });
  if (r.ms > 5000) problems.push({ id, step: label, kind: "lento", detail: `${r.ms} ms` });
  return r;
}

async function run(id) {
  const before = readDb(id);
  const nActs = before.activities.length;
  const nMeas = (before.measurements ?? []).length;
  const futureSession = before.plan?.weeks.flatMap((w) => w.sessions).find((s) => s.date > today && s.date <= dayOff(21) && s.type !== "race" && s.type !== "rest"); // el botón sale en las próximas semanas
  const blockDay = dayOff(10);

  // 1. registrar un entreno de ayer
  await step(id, "registrar", "src/app/actions.ts#saveActivity", [{}, form({ date: dayOff(-1), time: "08:00", sport: "run", name: "Prueba acciones", distanceKm: "6.2", duration: "34:10", feel: "bien", avgHr: "148" })]);
  // 2. una medida
  await step(id, "medida", "src/app/strength-actions.ts#saveMeasurement", [{}, form({ date: today, weightKg: "71.4", waistCm: "82" })]);
  // 3. «no puedo ese día» y deshacerlo
  if (futureSession) {
    await step(id, "saltar", "src/app/actions.ts#skipSession", [form({ date: futureSession.date })]);
    const mid = readDb(id);
    if (!(mid.unavailableDates ?? []).includes(futureSession.date)) problems.push({ id, step: "saltar", kind: "no-guardado", detail: `${futureSession.date} no quedó como día no disponible` });
    await step(id, "deshacer", "src/app/actions.ts#undoSkip", []);
    const back = readDb(id);
    if ((back.unavailableDates ?? []).includes(futureSession.date)) problems.push({ id, step: "deshacer", kind: "no-deshecho", detail: futureSession.date });
  }
  // 4. bloquear un día y liberarlo
  await step(id, "bloquear", "src/app/actions.ts#markUnavailableDates", [[blockDay]]);
  await step(id, "liberar", "src/app/actions.ts#clearUnavailable", [form({ date: blockDay })]);
  // 5. rehacer el plan
  if (before.plan) await step(id, "rehacer", "src/app/actions.ts#regeneratePlan", []);
  // 6. un entreno de fuerza
  await step(id, "fuerza", "src/app/strength-actions.ts#finishWorkout", [
    { name: "Fuerza prueba", startLocal: `${today}T07:30:00`, durationSec: 1800, rpe: 7, workout: { exercises: [{ exerciseId: "Goblet_Squat", sets: [{ kg: 16, reps: 10, done: true }, { kg: 16, reps: 10, done: true }] }] } },
  ]);
  // 7. cinco medidas a la vez (días distintos): no se debe perder ninguna
  await Promise.all([2, 3, 4, 5, 6].map((n) => step(id, "medidas-a-la-vez", "src/app/strength-actions.ts#saveMeasurement", [{}, form({ date: dayOff(-n), weightKg: String(70 + n / 10) })])));

  // comprobar lo guardado
  const after = readDb(id);
  const mine = after.activities.find((a) => a.name === "Prueba acciones");
  if (!mine) problems.push({ id, step: "registrar", kind: "no-guardado", detail: "el entreno no está" });
  else if (Math.abs(mine.distanceM - 6200) > 1 || mine.movingSec !== 2050) problems.push({ id, step: "registrar", kind: "datos", detail: `${mine.distanceM} m, ${mine.movingSec} s` });
  if (!after.activities.some((a) => a.name === "Fuerza prueba" && a.workout?.exercises?.length === 1)) problems.push({ id, step: "fuerza", kind: "no-guardado", detail: "el entreno de fuerza no está" });
  if (after.activities.length !== nActs + 2) problems.push({ id, step: "final", kind: "actividades", detail: `${nActs} → ${after.activities.length} (esperaba +2)` });
  const meas = after.measurements ?? [];
  const expectMeas = new Set([...(before.measurements ?? []).map((m) => m.date), today, ...[2, 3, 4, 5, 6].map((n) => dayOff(-n))]).size;
  if (meas.length !== expectMeas) problems.push({ id, step: "medidas-a-la-vez", kind: "perdidas", detail: `${nMeas} → ${meas.length} (esperaba ${expectMeas})` });
  if ((after.unavailableDates ?? []).includes(blockDay)) problems.push({ id, step: "liberar", kind: "no-liberado", detail: blockDay });
  if (before.plan && !after.plan?.weeks?.length) problems.push({ id, step: "rehacer", kind: "sin-plan", detail: "" });
  if (before.plan && after.plan) {
    const dup = after.plan.weeks.flatMap((w) => w.sessions).filter((s) => s.type !== "strength").map((s) => s.date);
    if (new Set(dup).size !== dup.length) problems.push({ id, step: "rehacer", kind: "dos-carreras-un-dia", detail: "" });
  }

  // 8. borrar el entreno registrado
  if (mine) {
    await step(id, "borrar", "src/app/actions.ts#deleteActivity", [form({ id: mine.id })]);
    if (readDb(id).activities.some((a) => a.id === mine.id)) problems.push({ id, step: "borrar", kind: "no-borrado", detail: mine.id });
  }
  done++;
  if (done % 100 === 0) console.log(`${done}/${ids.length} · ${problems.length} problemas`);
}

const queue = [...ids];
await Promise.all(Array.from({ length: Number(PAR) }, async () => {
  while (queue.length) await run(queue.shift());
}));

times.sort((a, b) => a - b);
const byKind = {};
for (const p of problems) byKind[`${p.step}/${p.kind}`] = (byKind[`${p.step}/${p.kind}`] ?? 0) + 1;
writeFileSync(OUT, JSON.stringify({ usuarios: ids.length, acciones: times.length, porTipo: byKind, problemas: problems.slice(0, 500) }, null, 2));
const pct = (p) => times[Math.floor(times.length * p)] ?? 0;
console.log(`Hecho: ${ids.length} usuarios, ${times.length} acciones en ${Math.round((Date.now() - t0) / 1000)} s (mediana ${pct(0.5)} ms, p95 ${pct(0.95)} ms) · ${problems.length} problemas`);
for (const [k, n] of Object.entries(byKind)) console.log(`  ${k}: ${n}`);
