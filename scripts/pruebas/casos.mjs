// Casos de uso de principio a fin contra `npx next start -p 3005` (sin la clave de la IA): personas que usan la app como
// lo haría alguien de verdad (crear el perfil, elegir carrera, registrar, fuerza, objetivos, amigos, otro idioma…).
// En cada paso se guarda con las acciones de la app, se mira que los datos queden bien y se abren sus pantallas buscando
// errores, textos rotos y, en inglés, frases que se quedaron en español. Los usuarios son «prueba-caso-…»: se borran con
// `npx jiti scripts/pruebas/usuarios.ts --borrar`.
//
//   node scripts/pruebas/casos.mjs <informe.json>                 una ronda (unos 15 s)
//   CASOS_MIN=60 node scripts/pruebas/casos.mjs <informe.json>    rondas seguidas durante 60 minutos, con datos al azar
//                                                                  (cada ronda, las 14 personas a la vez; limpia cada 25)
import { createHash, createHmac, randomBytes } from "node:crypto";
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";

const [OUT = "informe-casos.json"] = process.argv.slice(2);
const BASE = process.env.BASE ?? "http://localhost:3005";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const base = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN ?? env.GOOGLE_CLIENT_SECRET ?? env.OPENROUTER_API_KEY;
const secret = env.AUTH_SECRET || createHash("sha256").update(`statsrun-session:${base ?? "statsrun-dev"}`).digest("hex");
const cookieFor = (uid, lang = "es") => {
  const payload = `${uid}.${Math.floor(Date.now() / 1000) + 86400}`;
  return `sr_session=${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}; rio_lang=${lang}`;
};

const manifest = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8")).node;
const ACTIONS = {};
for (const [id, v] of Object.entries(manifest)) {
  const page = Object.keys(v.workers).find((w) => w.endsWith("/page") && !w.includes("["));
  if (!page || !v.exportedName) continue;
  const path = "/" + page.replace(/^app\//, "").replace(/(^|\/)page$/, "").replace(/\([^)]+\)\/?/g, "").replace(/\/$/, "");
  ACTIONS[`${v.filename}#${v.exportedName}`] = { id, path };
}

// ---------- utilidades ----------
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const now = new Date();
const today = ymd(now);
const day = (n) => ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n));
const readDb = (id) => JSON.parse(readFileSync(`data/db_${id}.json`, "utf8"));
const writeDb = (id, db) => writeFileSync(`data/db_${id}.json`, JSON.stringify(db));
const form = (entries) => Object.assign(Array.isArray(entries) ? entries : Object.entries(entries), { __form: true });

// ---------- rondas y azar ----------
let R = 0; // ronda: va en los ids («prueba-caso-novata-12»)
let seed = Number(process.env.SEMILLA ?? 2026);
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296), seed / 4294967296);
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pickOne = (list) => list[Math.floor(rnd() * list.length)];
const jitter = (n, d = 20) => n + int(-d, d);

const problems = [];
const log = [];
const celebrated = {}; // ¿la última acción de cada uno lanzó la animación de entreno registrado?
let steps = 0;
const counts = {};
const bad = (who, step, kind, detail = "") => {
  const k = `${who.replace(/^prueba-caso-/, "").replace(/-\d+$/, "")} · ${step.replace(/\/actividad\/.*/, "/actividad/…").replace(/\/amigos\/.*/, "/amigos/…")} · ${kind}`;
  counts[k] = (counts[k] ?? 0) + 1;
  if (counts[k] <= 5) problems.push({ who, step, kind, detail: String(detail).slice(0, 300) });
};
const check = (who, step, ok, detail) => {
  steps++;
  if (!ok) bad(who, step, "no-cumple", detail);
};

async function act(who, lang, step, name, args, { error = false } = {}) {
  const a = ACTIONS[name];
  if (!a) return bad(who, step, "accion-no-existe", name);
  const headers = { "Next-Action": a.id, Accept: "text/x-component", Origin: BASE, cookie: cookieFor(who, lang) };
  let body;
  const fi = args.findIndex((x) => Array.isArray(x) && x.__form);
  if (fi >= 0) {
    body = new FormData();
    for (const [k, v] of args[fi]) body.append(`_1_${k}`, String(v));
    body.append("0", JSON.stringify(args.map((x, i) => (i === fi ? "$K1" : x))));
  } else {
    body = JSON.stringify(args);
    headers["Content-Type"] = "text/plain;charset=UTF-8";
  }
  steps++;
  const res = await fetch(BASE + a.path, { method: "POST", headers, body, redirect: "manual" });
  const text = await res.text();
  if (res.status >= 500 || /"digest":"/.test(text)) bad(who, step, "error-servidor", `${res.status} ${text.slice(0, 200)}`);
  const err = text.match(/"error":"(?!\$)([^"]{0,200})/)?.[1];
  if (err && !error) bad(who, step, "rechazado", err);
  if (error && !err) bad(who, step, "esperaba-error", "");
  if (log.length < 2000) log.push({ who, step, status: res.status, error: err });
  celebrated[who] = res.headers.getSetCookie().find((c) => /^rio_fiesta=[a-z]/.test(c) && !/httponly/i.test(c))?.match(/^rio_fiesta=([a-z]+)/)[1];
  return err;
}

// texto visible (sin scripts ni el JSON de React)
const visible = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
const BROKEN = /\bNaN\b|\bundefined\b|Invalid Date|\[object Object\]|\bInfinity\b/;
// palabras de la interfaz que solo existen en español (para buscar lo que no se tradujo)
const ES_WORDS = /\b(Semana|semanas|Hoy|Mañana|Guardar|Añadir|Quitar|Empezar|Volver|sesiones|sesión|días|Rodaje|Tirada|Descanso|Objetivo|Ritmo|Distancia|Desnivel|Carrera|carreras|Entreno|entrenos|Fuerza|Rutina|rutinas|Ajustar|Registrar|Ver más|Ver en|Estadísticas|Amigos|Perfil|Récord|Últimas|Esta semana|Este mes|minutos|Añade|Cuánto|Qué|Estiramiento|ejercicio|Rodillas|pecho|mancuernas)\b/;
// en catalán y portugués muchas palabras son iguales que en español («Perfil», «Semana», «Ritmo»…): solo las que no
const ES_WORDS_BY = {
  ca: /\b(Semana|semanas|Hoy|Mañana|Guardar|Añadir|Quitar|Empezar|Volver|sesiones|sesión|días|Rodaje|Entreno|entrenos|Fuerza|Ritmo|Carrera|carreras|Estadísticas|Amigos|Últimas|Esta semana|Este mes|minutos|Cuánto|Estiramiento|ejercicio|Rodillas|mancuernas|Descanso|Objetivo|Distancia|Desnivel)\b/,
  pt: /\b(Hoy|Mañana|Añadir|Quitar|Empezar|Volver|sesiones|sesión|días|Rodaje|Tirada|Distancia|Desnivel|Carrera|carreras|Entreno|entrenos|Fuerza|Rutina|rutinas|Estadísticas|Récord|Este mes|Cuánto|Estiramiento|ejercicio|Rodillas|pecho|mancuernas)\b/,
};

async function page(who, lang, path, { expect = [], spanishOk = [] } = {}) {
  steps++;
  let res;
  let html = "";
  try {
    res = await fetch(BASE + path, { headers: { cookie: cookieFor(who, lang) }, redirect: "manual" });
    html = await res.text();
  } catch (e) {
    return bad(who, path, "sin-respuesta", e.message);
  }
  if (res.status >= 400) return bad(who, path, "estado", res.status);
  if (res.status >= 300) return bad(who, path, "redirige", res.headers.get("location"));
  if (/Algo ha fallado|Something went wrong/.test(html)) bad(who, path, "pantalla-error");
  const lines = visible(html);
  for (const l of lines) if (BROKEN.test(l)) bad(who, path, "texto-roto", l);
  for (const e of expect) if (!lines.some((l) => l.includes(e))) bad(who, path, "falta-texto", e);
  if (lang !== "es") {
    const words = ES_WORDS_BY[lang] ?? ES_WORDS;
    const es = lines.filter((l) => words.test(l) && !spanishOk.some((ok) => l.includes(ok)));
    for (const l of [...new Set(es)].slice(0, 15)) bad(who, path, "sin-traducir", l);
  }
  return lines;
}

// ---------- usuarios ----------
const USERS = "data/users.json";
function addUser(id, name) {
  const doc = JSON.parse(readFileSync(USERS, "utf8"));
  doc.users = doc.users.filter((u) => u.id !== id);
  doc.users.push({ id, username: id, name, createdAt: new Date().toISOString(), friendCode: randomBytes(3).toString("hex").toUpperCase(), friends: [] });
  writeFileSync(USERS, JSON.stringify(doc));
  writeDb(id, { activities: [] });
}

const profileForm = (p) =>
  form([
    ["name", p.name], ["sex", p.sex ?? pickOne(["female", "male"])], ["age", p.age ?? int(18, 66)], ["weightKg", p.weightKg ?? int(48, 98)], ["heightCm", p.heightCm ?? int(152, 196)],
    ["focus", p.focus ?? "ambos"], ["level", p.level ?? "principiante"], ["yearsRunning", p.yearsRunning ?? 0], ["weeklyKm", p.weeklyKm ?? 10],
    ["longestRunKm", p.longestRunKm ?? 6], ...(p.days ?? [0, 2, 4, 6]).map((d) => ["availableDays", d]), ["longRunDay", p.longRunDay ?? 6],
    ["strengthPerWeek", p.strengthPerWeek ?? int(0, 3)], ["strengthStyle", p.strengthStyle ?? "general"], ["injuries", p.injuries ?? ""],
  ]);

const PAGES = ["/", "/plan", "/plan/actual", "/plan/al-momento", "/fuerza", "/perfil", "/perfil?tab=running", "/perfil?tab=fuerza", "/perfil?tab=actividades", "/perfil?tab=salud", "/estadisticas", "/registrar", "/entrenador", "/amigos", "/carreras"];

// ---------- 1. Novata que prepara su primer 10K ----------
async function novata() {
  const who = `prueba-caso-novata-${R}`, L = "es";
  addUser(who, "Lucía Novata");
  await act(who, L, "perfil", "src/app/actions.ts#saveProfile", [{}, profileForm({ name: "Lucía Novata", level: "nuevo", weeklyKm: 0, longestRunKm: 0 })]);
  let db = readDb(who);
  check(who, "perfil", db.profile?.name === "Lucía Novata" && db.profile.availableDays.length === 4, JSON.stringify(db.profile)?.slice(0, 120));
  await act(who, L, "carrera", "src/app/actions.ts#saveGoal", [{}, form({ name: "10K de mi barrio", date: day(70), distanceKm: "10", targetTime: "" })]);
  db = readDb(who);
  check(who, "plan", db.plan?.weeks.length >= 9 && db.plan.goal.name === "10K de mi barrio", `semanas ${db.plan?.weeks.length}`);
  const first = db.plan?.weeks.flatMap((w) => w.sessions).filter((s) => s.type !== "strength" && s.date >= today).slice(0, 6) ?? [];
  check(who, "plan-novata", first.every((s) => s.distanceKm <= 6 && ["run_walk", "easy", "recovery", "long", "strides"].includes(s.type)), first.map((s) => `${s.type}:${s.distanceKm}`).join(" "));
  for (const p of PAGES) await page(who, L, p);
  // primera semana: registra lo que hace
  await act(who, L, "registrar", "src/app/actions.ts#saveActivity", [{}, form({ date: day(-1), time: "19:00", sport: "run", name: "Primer trote", distanceKm: "3", duration: "24:00", feel: "duro" })]);
  check(who, "animacion-registrar", celebrated[who] === "run", "registrar una carrera no lanza su animación");
  await act(who, L, "medida", "src/app/strength-actions.ts#saveMeasurement", [{}, form({ date: today, weightKg: "60.5" })]);
  check(who, "sin-animacion-medida", !celebrated[who], "guardar una medida lanza la animación");
  await act(who, L, "objetivo", "src/app/progress-actions.ts#addSuggestedTarget", []);
  await act(who, L, "al-momento", "src/app/progress-actions.ts#addInstantSession", [{}, form({ mode: "facil", i: "0" })]);
  const t0 = Date.parse(`${today}T07:00:00`);
  const pts = Array.from({ length: 181 }, (_, k) => ({ t: t0 + k * 3000, lat: 37.2 + k * 5.1e-5, lon: -3.6, alt: 640 + 5 * Math.sin(k / 30), acc: 6 }));
  await act(who, L, "gps", "src/app/actions.ts#saveRecordedRun", [{ sport: "run", name: "Vuelta al parque", startLocal: `${today}T07:00:00`, points: pts, rpe: 5 }]);
  check(who, "animacion-gps", celebrated[who] === "run", "grabar con GPS no lanza su animación");
  db = readDb(who);
  const gps = db.activities.find((a) => a.name === "Vuelta al parque");
  check(who, "gps", gps && gps.distanceM > 900 && gps.efforts?.[400], JSON.stringify(gps)?.slice(0, 160));
  check(who, "objetivo", db.targets?.length === 1, JSON.stringify(db.targets));
  check(who, "actividades", db.activities.length === 2, db.activities.map((a) => a.name).join(","));
  for (const p of ["/", "/estadisticas", "/plan/actual", `/actividad/${gps?.id}`]) await page(who, L, p);
}

// ---------- 2. Lesionado que no puede entrenar unos días ----------
async function lesionado() {
  const who = `prueba-caso-lesion-${R}`, L = "es";
  addUser(who, "Pablo Lesión");
  await act(who, L, "perfil", "src/app/actions.ts#saveProfile", [{}, profileForm({ name: "Pablo Lesión", sex: "male", age: 42, weightKg: 78, heightCm: 178, level: "intermedio", yearsRunning: 5, weeklyKm: 35, longestRunKm: 16, days: [0, 1, 3, 5, 6], longRunDay: 6, injuries: "tendinitis rotuliana" })]);
  await act(who, L, "carrera", "src/app/actions.ts#saveGoal", [{}, form({ name: "Media de primavera", date: day(jitter(120)), distanceKm: "21.0975", targetTime: "1:45:00" })]);
  let db = readDb(who);
  const next = db.plan.weeks.flatMap((w) => w.sessions).find((s) => s.date > today && s.date <= day(14) && s.type !== "strength");
  // una semana sin poder
  const nb = int(1, 7);
  await act(who, L, "bloquear", "src/app/actions.ts#markUnavailable", [{}, form({ from: day(1), to: day(nb) })]);
  db = readDb(who);
  const inBlocked = db.plan.weeks.flatMap((w) => w.sessions).filter((s) => s.date >= day(1) && s.date <= day(nb) && s.type !== "race");
  check(who, "bloquear", inBlocked.length === 0 && (db.unavailableDates ?? []).length === nb, inBlocked.map((s) => `${s.date}:${s.type}`).join(" "));
  await act(who, L, "deshacer", "src/app/actions.ts#undoSkip", []);
  db = readDb(who);
  check(who, "deshacer", !(db.unavailableDates ?? []).length && db.plan.weeks.flatMap((w) => w.sessions).some((s) => s.id === next?.id), JSON.stringify(db.unavailableDates));
  // solo un día y luego vuelve a estar disponible
  await act(who, L, "saltar", "src/app/actions.ts#skipSession", [form({ date: next.date })]);
  await act(who, L, "liberar", "src/app/actions.ts#clearUnavailable", [form({ date: next.date })]);
  db = readDb(who);
  check(who, "liberar", !(db.unavailableDates ?? []).includes(next.date), "");
  // cambiar de día una sesión
  const mv = db.plan.weeks.flatMap((w) => w.sessions).find((s) => s.date > today && s.date <= day(6) && s.type !== "strength" && s.type !== "long");
  const busy = new Set(db.plan.weeks.flatMap((w) => w.sessions).filter((s) => s.type !== "strength").map((s) => s.date));
  const free = [1, 2, 3, 4, 5, 6].map(day).find((d) => !busy.has(d));
  if (mv && free) {
    await act(who, L, "cambiar-dia", "src/app/actions.ts#moveSessionDay", [{}, form({ session: mv.id, to: free })]);
    const moved = readDb(who).plan.weeks.flatMap((w) => w.sessions).find((s) => s.type === mv.type && s.date === free);
    check(who, "cambiar-dia", Boolean(moved), `${mv.date} → ${free}`);
  }
  // rehacer con sus datos
  await act(who, L, "rehacer", "src/app/actions.ts#regeneratePlan", []);
  for (const p of ["/", "/plan/actual", "/estadisticas"]) await page(who, L, p);
}

// ---------- 3. Solo fuerza (sin carrera) ----------
async function fuerza() {
  const who = `prueba-caso-fuerza-${R}`, L = "es";
  addUser(who, "Marta Fuerza");
  await act(who, L, "perfil", "src/app/actions.ts#saveProfile", [{}, profileForm({ name: "Marta Fuerza", focus: "fuerza", strengthPerWeek: 3 })]);
  await act(who, L, "lugar", "src/app/strength-actions.ts#addPresetPlace", [form({ preset: "Gimnasio" })]);
  await act(who, L, "rutina", "src/app/strength-actions.ts#saveRoutine", [{ name: "Torso", exercises: [{ exerciseId: "Barbell_Bench_Press_-_Medium_Grip", sets: [{ reps: 8, kg: 40 }, { reps: 8, kg: 40 }, { reps: 8, kg: 40 }], restSec: 120 }, { exerciseId: "Bent_Over_Barbell_Row", sets: [{ reps: 10, kg: 35 }, { reps: 10, kg: 35 }], restSec: 90 }] }]);
  let db = readDb(who);
  const r = db.routines?.find((x) => x.name === "Torso");
  check(who, "rutina", r?.exercises.length === 2, JSON.stringify(db.routines)?.slice(0, 160));
  await act(who, L, "entreno", "src/app/strength-actions.ts#finishWorkout", [{ name: "Torso", startLocal: `${day(-1)}T18:00:00`, durationSec: 3000, rpe: 8, workout: { routineId: r?.id, exercises: [{ exerciseId: "Barbell_Bench_Press_-_Medium_Grip", sets: [{ kg: 42.5, reps: 8, done: true }, { kg: 42.5, reps: 7, done: true }] }] } }]);
  await act(who, L, "cambiar-rutina", "src/app/strength-actions.ts#saveRoutine", [{ id: r?.id, name: "Torso A", exercises: r?.exercises }]);
  await act(who, L, "duplicar", "src/app/strength-actions.ts#duplicateRoutine", [form({ id: r?.id })]);
  db = readDb(who);
  check(who, "rutinas", db.routines?.length === 2 && db.routines.some((x) => x.name === "Torso A"), db.routines?.map((x) => x.name).join(","));
  check(who, "sin-plan", !db.plan, "");
  check(who, "entreno", db.activities.some((a) => a.workout?.exercises[0]?.sets.length === 2), "");
  for (const p of PAGES) await page(who, L, p);
  const w = db.activities.find((a) => a.workout);
  if (w) await page(who, L, `/actividad/${w.id}`);
}

// ---------- 4. Temporada con varias carreras ----------
async function temporada() {
  const who = `prueba-caso-temporada-${R}`, L = "es";
  addUser(who, "Iker Temporada");
  await act(who, L, "perfil", "src/app/actions.ts#saveProfile", [{}, profileForm({ name: "Iker Temporada", sex: "male", age: 29, weightKg: 70, heightCm: 180, level: "avanzado", yearsRunning: 8, weeklyKm: 60, longestRunKm: 28, days: [0, 1, 2, 3, 4, 6], longRunDay: 6, strengthPerWeek: 1 })]);
  await act(who, L, "maraton", "src/app/actions.ts#saveGoal", [{}, form({ name: "Maratón de Sevilla", date: day(150), distanceKm: "42.195", targetTime: "2:59:00" })]);
  await act(who, L, "media-A", "src/app/actions.ts#addTuneUpRace", [{}, form({ name: "Media A", date: day(60), distanceKm: "21.0975", priority: "A", targetTime: "" })]);
  await act(who, L, "10k-B", "src/app/actions.ts#addTuneUpRace", [{}, form({ name: "10K B", date: day(100), distanceKm: "10", priority: "B", targetTime: "" })]);
  await act(who, L, "5k-C", "src/app/actions.ts#addTuneUpRace", [{}, form({ name: "5K C", date: day(30), distanceKm: "5", priority: "C", targetTime: "" })]);
  await act(who, L, "mismo-dia", "src/app/actions.ts#addTuneUpRace", [{}, form({ name: "Otra", date: day(30), distanceKm: "5", priority: "C", targetTime: "" })], { error: true });
  await act(who, L, "dia-principal", "src/app/actions.ts#addTuneUpRace", [{}, form({ name: "Otra", date: day(150), distanceKm: "5", priority: "C", targetTime: "" })], { error: true });
  let db = readDb(who);
  const races = db.plan.weeks.flatMap((w) => w.sessions).filter((s) => s.type === "race").map((s) => s.date).sort();
  check(who, "carreras-en-plan", JSON.stringify(races) === JSON.stringify([day(30), day(60), day(100), day(150)].sort()), races.join(","));
  const perDay = new Map();
  for (const s of db.plan.weeks.flatMap((w) => w.sessions).filter((x) => x.type !== "strength")) perDay.set(s.date, (perDay.get(s.date) ?? 0) + 1);
  check(who, "una-por-dia", [...perDay.values()].every((n) => n === 1), [...perDay].filter(([, n]) => n > 1).map(([d]) => d).join(","));
  const c = db.races.find((r) => r.name === "5K C");
  await act(who, L, "quitar-C", "src/app/actions.ts#removeTuneUpRace", [form({ id: c.id })]);
  db = readDb(who);
  check(who, "quitar-C", !db.plan.weeks.flatMap((w) => w.sessions).some((s) => s.type === "race" && s.date === day(30)), "");
  for (const p of ["/", "/plan/actual", "/carreras", "/estadisticas"]) await page(who, L, p);
}

// ---------- 5. En otro idioma: buscar lo que se quedó en español ----------
async function otroIdioma(L) {
  const who = `prueba-caso-${L}-${R}`;
  addUser(who, "Emma English");
  await act(who, L, "idioma", "src/app/lang-actions.ts#setLanguage", [form({ lang: L })]);
  await act(who, L, "perfil", "src/app/actions.ts#saveProfile", [{}, profileForm({ name: "Emma English", level: "intermedio", yearsRunning: 3, weeklyKm: 30, longestRunKm: 14, days: [1, 3, 5, 6], longRunDay: 6, injuries: "knee pain" })]);
  await act(who, L, "carrera", "src/app/actions.ts#saveGoal", [{}, form({ name: "London Half", date: day(jitter(84)), distanceKm: "21.0975", targetTime: "1:25:00" })]);
  await act(who, L, "registrar", "src/app/actions.ts#saveActivity", [{}, form({ date: day(-2), time: "08:00", sport: "run", name: "Morning run", distanceKm: "8", duration: "46:00", feel: "bien" })]);
  await act(who, L, "fuerza", "src/app/strength-actions.ts#finishWorkout", [{ name: "Legs", startLocal: `${day(-1)}T18:00:00`, durationSec: 2400, rpe: 7, workout: { exercises: [{ exerciseId: "Goblet_Squat", sets: [{ kg: 16, reps: 10, done: true }] }] } }]);
  await act(who, L, "objetivo", "src/app/progress-actions.ts#addTarget", [{}, form({ period: "month", metric: "km", sport: "run", value: "100" })]);
  const db = readDb(who);
  check(who, "idioma", db.lang === L, db.lang);
  check(who, "avisos", db.plan?.warnings.length >= 2, JSON.stringify(db.plan?.warnings));
  // nombres propios o del usuario; la guía del atajo de Salud del iPhone sigue en español (apuntado en el Roadmap);
  // los tipos de carrera de Cruzando la Meta son de su web
  const ok = ["Emma", "London", "Morning", "Legs", "Zancavolt", "Carrera urbana", "knee pain"];
  const guide = L !== "es";
  for (const p of PAGES.filter((x) => !(guide && x === "/perfil?tab=salud"))) await page(who, L, p, { spanishOk: ok });
  await page(who, L, "/perfil?tab=salud", { spanishOk: [""] }); // abre bien, aunque la guía siga en español
  for (const a of db.activities) await page(who, L, `/actividad/${a.id}`, { spanishOk: ok });
}

// ---------- 6. Dos amigos ----------
async function amigos() {
  const a = `prueba-caso-amiga-${R}`, b = `prueba-caso-amigo-${R}`, L = "es";
  const c = `prueba-caso-extrano-${R}`;
  addUser(a, "Sara Amiga");
  addUser(b, "Dani Amigo");
  addUser(c, "Extraño");
  for (const [who, name] of [[a, "Sara Amiga"], [b, "Dani Amigo"]]) await act(who, L, "perfil", "src/app/actions.ts#saveProfile", [{}, profileForm({ name })]);
  await act(a, L, "pedir", "src/app/auth-actions.ts#requestFriend", [form({ id: b })]);
  await act(b, L, "aceptar", "src/app/auth-actions.ts#answerRequest", [form({ id: a, accept: "1" })]);
  const users = JSON.parse(readFileSync(USERS, "utf8")).users;
  check(a, "amistad", users.find((u) => u.id === a)?.friends.includes(b) && users.find((u) => u.id === b)?.friends.includes(a), "");
  await act(a, L, "entreno-juntos", "src/app/actions.ts#saveActivity", [{}, form([["date", day(-1)], ["time", "09:00"], ["sport", "run"], ["name", "Rodaje con Dani"], ["distanceKm", "7"], ["duration", "40:00"], ["with", b]])]);
  const act1 = readDb(a).activities.find((x) => x.name === "Rodaje con Dani");
  check(a, "con-amigo", act1?.with?.includes(b), JSON.stringify(act1?.with));
  await page(b, L, `/amigos/${a}`, { expect: ["Sara Amiga"] });
  if (act1) await page(b, L, `/actividad/${encodeURIComponent(act1.id)}?de=${a}`, { expect: ["Rodaje con Dani"] });
  await page(b, L, "/amigos");
  // un desconocido no puede ver su ficha
  steps++;
  const res = await fetch(`${BASE}/amigos/${a}`, { headers: { cookie: cookieFor(c) }, redirect: "manual" });
  const html = await res.text();
  if (res.status === 200 && html.includes("Rodaje con Dani")) bad(c, "privacidad", "ve-entrenos-ajenos", "");
  await act(a, L, "dejar", "src/app/auth-actions.ts#unfriend", [form({ id: b })]);
  check(a, "dejar", !JSON.parse(readFileSync(USERS, "utf8")).users.find((u) => u.id === a)?.friends.includes(b), "");
}

// ---------- 7. Importa un GPX, lo edita y le pone foto ----------
async function importadora() {
  const who = `prueba-caso-gpx-${R}`, L = "es";
  addUser(who, "Nuria Importa");
  await act(who, L, "perfil", "src/app/actions.ts#saveProfile", [{}, profileForm({ name: "Nuria Importa", level: "intermedio", weeklyKm: 25, longestRunKm: 12 })]);
  // 3 km con una cuesta, un punto cada 5 s
  const start = Date.parse(`${day(-3)}T08:00:00Z`);
  const trkpts = Array.from({ length: 200 }, (_, k) => `<trkpt lat="${(40.4 + k * 1.35e-4).toFixed(6)}" lon="-3.7"><ele>${(650 + 15 * Math.sin(k / 30)).toFixed(1)}</ele><time>${new Date(start + k * 5000).toISOString()}</time></trkpt>`).join("");
  const gpx = `<?xml version="1.0"?><gpx version="1.1" creator="prueba"><trk><name>Retiro con cuestas</name><type>running</type><trkseg>${trkpts}</trkseg></trk></gpx>`;
  const fd = new FormData();
  fd.append("files", new Blob([gpx], { type: "application/gpx+xml" }), "retiro.gpx");
  steps++;
  const res = await fetch(`${BASE}/api/import`, { method: "POST", headers: { cookie: cookieFor(who), Origin: BASE }, body: fd });
  const j = await res.json().catch(() => ({}));
  check(who, "importar", res.status === 200 && j.added === 1, `${res.status} ${JSON.stringify(j)}`);
  let db = readDb(who);
  const a = db.activities[0];
  check(who, "importar-datos", a && Math.abs(a.distanceM - 3000) < 150 && a.efforts?.[1000] && a.elevationGainM > 10, JSON.stringify(a)?.slice(0, 200));
  if (!a) return;
  // la serie para los gráficos
  steps++;
  const s = await (await fetch(`${BASE}/api/serie/${who}/${encodeURIComponent(a.id)}`, { headers: { cookie: cookieFor(who) } })).json();
  check(who, "serie", s.stream?.alt?.length > 10 && s.efforts?.[1000], JSON.stringify(s).slice(0, 120));
  // el mismo archivo otra vez: no se duplica
  const fd2 = new FormData();
  fd2.append("files", new Blob([gpx], { type: "application/gpx+xml" }), "retiro.gpx");
  steps++;
  const j2 = await (await fetch(`${BASE}/api/import`, { method: "POST", headers: { cookie: cookieFor(who), Origin: BASE }, body: fd2 })).json();
  check(who, "sin-duplicar", j2.added === 0 && readDb(who).activities.length === 1, JSON.stringify(j2));
  // editarlo: nombre, sensaciones y RPE
  await act(who, L, "editar", "src/app/actions.ts#saveActivity", [{}, form({ id: a.id, date: a.date, time: a.startLocal.slice(11, 16), sport: "run", name: "Retiro con cuestas (editada)", distanceKm: String(a.distanceM / 1000), duration: `${Math.floor(a.movingSec / 60)}:${String(a.movingSec % 60).padStart(2, "0")}`, feel: "duro", feelings: "Las cuestas me costaron", rpe: "8" })]);
  check(who, "sin-animacion-editar", !celebrated[who], "editar un entreno lanza la animación");
  db = readDb(who);
  const e = db.activities.find((x) => x.id === a.id);
  check(who, "editar", e?.name === "Retiro con cuestas (editada)" && e.feelings === "Las cuestas me costaron" && db.activities.length === 1 && e.efforts?.[1000], JSON.stringify(e)?.slice(0, 160));
  // una foto (JPEG mínimo hecho con sharp)
  const sharp = (await import("sharp")).default;
  const jpg = await sharp({ create: { width: 16, height: 16, channels: 3, background: "#d4ff3a" } }).jpeg().toBuffer();
  await act(who, L, "foto", "src/app/actions.ts#setActivityPhoto", [a.id, `data:image/jpeg;base64,${jpg.toString("base64")}`]);
  db = readDb(who);
  check(who, "foto", Boolean(db.activities.find((x) => x.id === a.id)?.photoAt), "");
  for (const p of [`/actividad/${encodeURIComponent(a.id)}`, "/perfil?tab=actividades", "/estadisticas"]) await page(who, L, p);
  await act(who, L, "quitar-foto", "src/app/actions.ts#setActivityPhoto", [a.id, null]);
  check(who, "quitar-foto", !readDb(who).activities.find((x) => x.id === a.id)?.photoAt, "");
}

// ---------- 8. iPhone: atajo de Salud ----------
async function salud() {
  const who = `prueba-caso-salud-${R}`, L = "es";
  addUser(who, "Hugo Salud");
  await act(who, L, "perfil", "src/app/actions.ts#saveProfile", [{}, profileForm({ name: "Hugo Salud", sex: "male" })]);
  // la clave sale en la respuesta de la acción (formato de React): se busca «rio_…»
  const a = ACTIONS["src/app/actions.ts#newHealthKey"];
  steps++;
  const r = await fetch(BASE + a.path, { method: "POST", headers: { "Next-Action": a.id, Accept: "text/x-component", Origin: BASE, cookie: cookieFor(who), "Content-Type": "text/plain;charset=UTF-8" }, body: "[]" });
  const token = (await r.text()).match(/rio_[A-Za-z0-9_-]+/)?.[0];
  check(who, "clave", Boolean(token), "");
  if (!token) return;
  const send = async (body, key = token) => {
    steps++;
    const res = await fetch(`${BASE}/api/salud`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return [res.status, await res.json().catch(() => ({}))];
  };
  let [st, j] = await send({ date: today, steps: 8234, activeKcal: 512, sueno: "7,5", pulsoReposo: 52, vfc: 58 });
  check(who, "salud-hoy", st === 200 && j.ok && /pasos/.test(j.message), `${st} ${JSON.stringify(j)}`);
  // la respuesta (sale en la notificación del iPhone), en su idioma
  await act(who, "en", "idioma-en", "src/app/lang-actions.ts#setLanguage", [form({ lang: "en" })]);
  [st, j] = await send({ date: today, steps: 9000 });
  check(who, "salud-en-ingles", st === 200 && /9,000 steps/.test(j.message), `${st} ${JSON.stringify(j)}`);
  await act(who, "es", "idioma-es", "src/app/lang-actions.ts#setLanguage", [form({ lang: "es" })]);
  // varios días a la vez (lista)
  [st, j] = await send({ dias: [{ date: day(-2), steps: 6000 }, { date: day(-1), steps: 11000, sleep: 420 }] });
  check(who, "salud-lista", st === 200, `${st} ${JSON.stringify(j)}`);
  [st, j] = await send({ steps: 100 }, "rio_falsa");
  check(who, "clave-falsa", st === 401, String(st));
  [st, j] = await send("nada");
  check(who, "cuerpo-raro", st === 400, `${st} ${JSON.stringify(j)}`);
  const db = readDb(who);
  const h = db.health ?? [];
  check(who, "guardado", h.find((x) => x.date === today)?.steps === 9000 && h.find((x) => x.date === today)?.sleepHours === 7.5 && h.length >= 3, JSON.stringify(h).slice(0, 200));
  for (const p of ["/", "/perfil?tab=salud", "/sueno", "/plan"]) await page(who, L, p);
  await act(who, L, "revocar", "src/app/actions.ts#revokeHealthKey", []);
  [st] = await send({ steps: 1 });
  check(who, "revocada", st === 401, String(st));
}

// ---------- 9. Fuerza por grupos, lugares, ejercicio propio y EMOM ----------
async function grupos() {
  const who = `prueba-caso-grupos-${R}`, L = "es";
  addUser(who, "Alba Grupos");
  await act(who, L, "perfil", "src/app/actions.ts#saveProfile", [{}, profileForm({ name: "Alba Grupos", level: "intermedio", weeklyKm: 30, longestRunKm: 14, days: [0, 1, 2, 3, 4, 5, 6], longRunDay: 6, strengthPerWeek: 4, strengthStyle: "grupos" })]);
  await act(who, L, "carrera", "src/app/actions.ts#saveGoal", [{}, form({ name: "15K", date: day(jitter(90)), distanceKm: "15", targetTime: "" })]);
  await act(who, L, "lugar", "src/app/strength-actions.ts#savePlace", [{}, form([["name", "Casa"], ["notes", "Mancuernas de 12 kg"], ["eq", "mancuernas"], ["eq", "bandas"]])]);
  await act(who, L, "lugar-2", "src/app/strength-actions.ts#addPresetPlace", [form({ preset: "Gimnasio" })]);
  let db = readDb(who);
  const casa = db.places?.find((p) => p.name === "Casa");
  check(who, "lugares", db.places?.length === 2 && casa?.equipment.includes("corporal"), JSON.stringify(db.places)?.slice(0, 160));
  await act(who, L, "lugar-activo", "src/app/strength-actions.ts#setActivePlace", [form({ id: casa?.id })]);
  await act(who, L, "ejercicio-propio", "src/app/strength-actions.ts#saveCustomExercise", [{}, form([["name", "Remo con toalla"], ["cat", "fuerza"], ["muscles", "espalda"], ["secondary", "biceps"], ["eq", "corporal"], ["steps", "Tira de la toalla\nAguanta 2 segundos"]])]);
  db = readDb(who);
  const own = db.customExercises?.[0];
  check(who, "ejercicio-propio", own?.name === "Remo con toalla", JSON.stringify(db.customExercises)?.slice(0, 120));
  await act(who, L, "rutina", "src/app/strength-actions.ts#saveRoutine", [{ name: "Espalda casa", exercises: [{ exerciseId: own?.id, sets: [{ reps: 12 }, { reps: 12 }], restSec: 60 }, { exerciseId: "Bent_Over_Two-Dumbbell_Row", sets: [{ reps: 10, kg: 12 }], restSec: 90 }] }]);
  db = readDb(who);
  const r = db.routines?.find((x) => x.name === "Espalda casa");
  await act(who, L, "rutina-al-plan", "src/app/strength-actions.ts#setRoutinePlanSlot", [form({ id: r?.id, slot: "espalda" })]);
  db = readDb(who);
  const used = db.plan?.weeks.flatMap((w) => w.sessions).filter((s) => s.routineId === r?.id) ?? [];
  check(who, "rutina-en-plan", used.length > 0, `sesiones con la rutina: ${used.length}`);
  // EMOM de 10 minutos con 8 rondas hechas
  await act(who, L, "emom", "src/app/strength-actions.ts#finishWorkout", [{ name: "EMOM burpees", startLocal: `${today}T07:00:00`, durationSec: 600, rpe: 9, workout: { emom: { intervalSec: 60, rounds: 10, done: 8 }, exercises: [{ exerciseId: "Mountain_Climbers", sets: Array.from({ length: 10 }, (_, i) => ({ reps: 10, done: i < 8 })) }] } }]);
  db = readDb(who);
  const emom = db.activities.find((a) => a.name === "EMOM burpees");
  check(who, "emom", emom?.workout?.emom?.done === 8 && emom.workout.exercises[0]?.sets.length === 8, JSON.stringify(emom?.workout)?.slice(0, 160));
  for (const p of ["/fuerza", "/plan/actual", "/", `/actividad/${encodeURIComponent(emom?.id ?? "x")}`, `/fuerza/ejercicios/${encodeURIComponent(own?.id ?? "x")}`]) await page(who, L, p);
  // borrar lo propio: el ejercicio no puede romper la rutina
  await act(who, L, "borrar-ejercicio", "src/app/strength-actions.ts#deleteCustomExercise", [form({ id: own?.id })]);
  await act(who, L, "borrar-lugar", "src/app/strength-actions.ts#deletePlace", [form({ id: casa?.id })]);
  for (const p of ["/fuerza", "/plan/actual"]) await page(who, L, p);
}

// ---------- 10. Se equivoca: los errores tienen que salir (y nada se guarda) ----------
async function errores() {
  const who = `prueba-caso-errores-${R}`, L = "es";
  addUser(who, "Rita Errores");
  await act(who, L, "edad-rara", "src/app/actions.ts#saveProfile", [{}, profileForm({ name: "Rita", age: 3 })], { error: true });
  await act(who, L, "sin-dias", "src/app/actions.ts#saveProfile", [{}, profileForm({ name: "Rita", days: [3] })], { error: true });
  await act(who, L, "tirada-fuera", "src/app/actions.ts#saveProfile", [{}, profileForm({ name: "Rita", days: [0, 2], longRunDay: 6 })], { error: true });
  check(who, "nada-guardado", !readDb(who).profile, "");
  await act(who, L, "perfil", "src/app/actions.ts#saveProfile", [{}, profileForm({ name: "Rita Errores" })]);
  await act(who, L, "carrera-pasada", "src/app/actions.ts#saveGoal", [{}, form({ name: "Pasada", date: day(-5), distanceKm: "10", targetTime: "" })], { error: true });
  await act(who, L, "carrera-tiempo-raro", "src/app/actions.ts#saveGoal", [{}, form({ name: "Rara", date: day(60), distanceKm: "10", targetTime: "abc" })], { error: true });
  await act(who, L, "entreno-futuro", "src/app/actions.ts#saveActivity", [{}, form({ date: day(2), sport: "run", distanceKm: "5", duration: "30:00" })], { error: true });
  await act(who, L, "ritmo-imposible", "src/app/actions.ts#saveActivity", [{}, form({ date: day(-1), sport: "run", distanceKm: "10", duration: "10:00" })], { error: true });
  await act(who, L, "sin-tiempo", "src/app/actions.ts#saveActivity", [{}, form({ date: day(-1), sport: "run", distanceKm: "5" })], { error: true });
  await act(who, L, "fc-rara", "src/app/actions.ts#saveActivity", [{}, form({ date: day(-1), sport: "run", distanceKm: "5", duration: "30:00", avgHr: "300" })], { error: true });
  await act(who, L, "medida-rara", "src/app/strength-actions.ts#saveMeasurement", [{}, form({ date: today, weightKg: "900" })], { error: true });
  await act(who, L, "objetivo-raro", "src/app/progress-actions.ts#addTarget", [{}, form({ period: "week", metric: "km", sport: "run", value: "-3" })], { error: true });
  await act(who, L, "rutina-vacia", "src/app/strength-actions.ts#saveRoutine", [{ name: "Vacía", exercises: [] }], { error: true });
  await act(who, L, "rutina-sin-nombre", "src/app/strength-actions.ts#saveRoutine", [{ name: "", exercises: [{ exerciseId: "Pushups", sets: [{ reps: 10 }] }] }], { error: true });
  await act(who, L, "bloquear-pasado", "src/app/actions.ts#markUnavailable", [{}, form({ from: day(-3), to: day(-1) })], { error: true });
  await act(who, L, "bloquear-largo", "src/app/actions.ts#markUnavailable", [{}, form({ from: day(1), to: day(80) })], { error: true });
  await act(who, L, "foto-mala", "src/app/actions.ts#setActivityPhoto", ["no-existe", "data:image/jpeg;base64,xxxx"], { error: true });
  await act(who, L, "borrar-sin-confirmar", "src/app/auth-actions.ts#deleteAccount", [{}, form({ confirm: "no" })], { error: true });
  const db = readDb(who);
  check(who, "nada-de-mas", db.activities.length === 0 && !(db.measurements ?? []).length && !(db.targets ?? []).length && !(db.routines ?? []).length && !(db.unavailableDates ?? []).length, JSON.stringify({ a: db.activities.length, m: db.measurements, t: db.targets, r: db.routines?.length, u: db.unavailableDates }));
  // los mensajes, en su idioma: el mismo error en inglés no sale en español
  const en = await act(who, "en", "error-en-ingles", "src/app/actions.ts#saveActivity", [{}, form({ date: day(2), sport: "run", distanceKm: "5", duration: "30:00" })], { error: true });
  check(who, "error-traducido", en && !/futura|fecha/i.test(en), en);
}

// ---------- 11. Cambia de idea: termina el plan, otro objetivo, otro idioma ----------
async function cambia() {
  const who = `prueba-caso-cambia-${R}`, L = "es";
  addUser(who, "Leo Cambia");
  await act(who, L, "perfil", "src/app/actions.ts#saveProfile", [{}, profileForm({ name: "Leo Cambia", level: "intermedio", weeklyKm: 30, longestRunKm: 15 })]);
  await act(who, L, "media", "src/app/actions.ts#saveGoal", [{}, form({ name: "Media", date: day(jitter(80)), distanceKm: "21.0975", targetTime: "" })]);
  await act(who, L, "terminar", "src/app/actions.ts#clearPlan", []);
  let db = readDb(who);
  check(who, "terminar", !db.plan && (db.pastPlans?.length ?? 0) === 1, `plan ${Boolean(db.plan)} anteriores ${db.pastPlans?.length}`);
  await act(who, L, "10k", "src/app/actions.ts#saveGoal", [{}, form({ name: "10K nuevo", date: day(45), distanceKm: "10", targetTime: "45:00" })]);
  db = readDb(who);
  check(who, "nuevo-plan", db.plan?.goal.name === "10K nuevo", db.plan?.goal.name);
  const past = db.pastPlans?.[0];
  if (past) {
    await page(who, L, `/plan/anterior/${encodeURIComponent(past.id)}`);
    await act(who, L, "borrar-anterior", "src/app/actions.ts#deletePastPlan", [form({ id: past.id })]);
    check(who, "borrar-anterior", !(readDb(who).pastPlans ?? []).length, JSON.stringify(readDb(who).pastPlans?.map((p) => p.id)));
  }
  // cambia la fecha de su carrera (otra vez el mismo formulario)
  await act(who, L, "otra-fecha", "src/app/actions.ts#saveGoal", [{}, form({ name: "10K nuevo", date: day(60), distanceKm: "10", targetTime: "45:00" })]);
  check(who, "otra-fecha", readDb(who).plan?.goal.date === day(60), readDb(who).plan?.goal.date);
  for (const lang of ["ca", "pt"]) {
    await act(who, lang, `idioma-${lang}`, "src/app/lang-actions.ts#setLanguage", [form({ lang })]);
    check(who, `idioma-${lang}`, readDb(who).lang === lang, readDb(who).lang);
    for (const p of PAGES.filter((x) => x !== "/perfil?tab=salud")) await page(who, lang, p, { spanishOk: ["Leo", "10K nuevo", "Zancavolt", "Carrera urbana"] });
  }
}

// ---------- 12. Memoria de la IA: preferencias y valoraciones (sin llamar a la IA) ----------
async function memoria() {
  const who = `prueba-caso-memoria-${R}`, L = "es";
  addUser(who, "Ana Memoria");
  await act(who, L, "perfil", "src/app/actions.ts#saveProfile", [{}, profileForm({ name: "Ana Memoria" })]);
  await act(who, L, "preferencia", "src/app/ai-actions.ts#addAiPreference", [{}, form({ text: "No quiero zancadas", area: "fuerza" })]);
  await act(who, L, "repetida", "src/app/ai-actions.ts#addAiPreference", [{}, form({ text: "No quiero zancadas", area: "fuerza" })], { error: true });
  await act(who, L, "corta", "src/app/ai-actions.ts#addAiPreference", [{}, form({ text: "x", area: "todas" })], { error: true });
  let db = readDb(who);
  const pref = db.aiPreferences?.[0];
  check(who, "preferencia", db.aiPreferences?.length === 1 && pref?.text === "No quiero zancadas", JSON.stringify(db.aiPreferences));
  // valorar una respuesta del plan (hace falta un resumen guardado)
  db.coach = { updatedAt: new Date().toISOString(), model: "x", summary: "Mantienes la carga.", changed: 0 };
  writeDb(who, db);
  await act(who, L, "valorar-mal", "src/app/ai-actions.ts#rateAi", [{}, form({ area: "plan", ref: db.coach.updatedAt, rating: "-1", reason: "Me pone las series el día antes de la tirada" })]);
  db = readDb(who);
  check(who, "valoracion", db.aiFeedback?.length === 1 && db.aiPreferences?.length === 2, `valoraciones ${db.aiFeedback?.length} preferencias ${db.aiPreferences?.length}`);
  await act(who, L, "quitar-preferencia", "src/app/ai-actions.ts#deleteAiPreference", [form({ id: pref?.id })]);
  check(who, "quitar-preferencia", readDb(who).aiPreferences?.length === 1, "");
  for (const p of ["/entrenador", "/plan/actual"]) await page(who, L, p);
}

// ---------- 13. Se va: borra su cuenta y no queda nada ----------
async function seVa() {
  const who = `prueba-caso-adios-${R}`, L = "es";
  addUser(who, "Iván Adiós");
  await act(who, L, "perfil", "src/app/actions.ts#saveProfile", [{}, profileForm({ name: "Iván Adiós" })]);
  const t0r = Date.parse(`${today}T07:00:00`);
  const pts = Array.from({ length: 121 }, (_, k) => ({ t: t0r + k * 3000, lat: 37.2 + k * 5e-5, lon: -3.6, alt: 640, acc: 6 }));
  await act(who, L, "gps", "src/app/actions.ts#saveRecordedRun", [{ sport: "run", name: "Última", startLocal: `${today}T07:00:00`, points: pts, rpe: 5 }]);
  const a = readDb(who).activities[0];
  await act(who, L, "borrar-cuenta", "src/app/auth-actions.ts#deleteAccount", [{}, form({ confirm: "BORRAR" })]);
  const { existsSync } = await import("node:fs");
  check(who, "sin-datos", !existsSync(`data/db_${who}.json`), "queda su Db");
  check(who, "sin-usuario", !JSON.parse(readFileSync(USERS, "utf8")).users.some((u) => u.id === who), "queda en users.json");
  check(who, "sin-serie", !a || !existsSync(`data/serie_${who}_${a.id}.json`), "queda la serie de su carrera con GPS");
}

// ---------- limpieza entre rondas (con el servidor parado de escribir: entre una ronda y otra) ----------
function limpiar() {
  for (const f of readdirSync("data")) if (["db_", "serie_", "foto_"].some((p) => f.startsWith(`${p}prueba-caso-`))) rmSync(`data/${f}`, { force: true });
  const doc = JSON.parse(readFileSync(USERS, "utf8"));
  doc.users = doc.users.filter((u) => !u.id.startsWith("prueba-caso-")).map((u) => ({ ...u, friends: u.friends.filter((x) => !x.startsWith("prueba-caso-")), requests: u.requests?.filter((x) => !x.startsWith("prueba-caso-")) }));
  writeFileSync(USERS, JSON.stringify(doc));
}

const PERSONAS = { novata, lesionado, fuerza, temporada, ingles: () => otroIdioma("en"), frances: () => otroIdioma("fr"), catalan: () => otroIdioma("ca"), portugues: () => otroIdioma("pt"), amigos, importadora, salud, grupos, errores, cambia, memoria, seVa };
const MINUTES = Number(process.env.CASOS_MIN ?? 0);
const t0 = Date.now();
let personas = 0;
do {
  // las 14 a la vez: cada una crea su usuario antes de su primer await (la ronda empieza con users.json quieto)
  await Promise.all(
    Object.entries(PERSONAS).map(async ([name, fn]) => {
      try {
        await fn();
      } catch (e) {
        bad(`prueba-caso-${name}-${R}`, "script", "excepcion", e.stack?.split("\n").slice(0, 3).join(" | "));
      }
      personas++;
    }),
  );
  R++;
  if (R % 25 === 0) limpiar();
  if (R % 10 === 0 || !MINUTES) {
    const min = (Date.now() - t0) / 60000;
    console.log(`ronda ${R} · ${personas} personas · ${steps} comprobaciones · ${Object.values(counts).reduce((a, b) => a + b, 0)} problemas · ${min.toFixed(1)} min`);
    writeFileSync(OUT, JSON.stringify({ rondas: R, personas, pasos: steps, porTipo: counts, problemas: problems, acciones: log.slice(-200) }, null, 2));
  }
} while (MINUTES && Date.now() - t0 < MINUTES * 60000);
limpiar();
writeFileSync(OUT, JSON.stringify({ rondas: R, personas, pasos: steps, porTipo: counts, problemas: problems, acciones: log.slice(-200) }, null, 2));
console.log(`Hecho: ${R} rondas, ${personas} personas, ${steps} comprobaciones en ${Math.round((Date.now() - t0) / 1000)} s · ${Object.values(counts).reduce((a, b) => a + b, 0)} problemas`);
for (const [k, n] of Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(`  ${n} × ${k}`);
