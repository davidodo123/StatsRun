// Casos de uso de principio a fin contra `npx next start -p 3005` (sin la clave de la IA): personas que usan la app como
// lo haría alguien de verdad (crear el perfil, elegir carrera, registrar, fuerza, objetivos, amigos, otro idioma…).
// En cada paso se guarda con las acciones de la app, se mira que los datos queden bien y se abren sus pantallas buscando
// errores, textos rotos y, en inglés, frases que se quedaron en español. Los usuarios son «prueba-caso-…»: se borran con
// `npx jiti scripts/pruebas/usuarios.ts --borrar`.
//
//   node scripts/pruebas/casos.mjs <informe.json>
import { createHash, createHmac, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

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

const problems = [];
const log = [];
let steps = 0;
const bad = (who, step, kind, detail = "") => problems.push({ who, step, kind, detail: String(detail).slice(0, 300) });
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
  log.push({ who, step, status: res.status, error: err });
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
    const es = lines.filter((l) => ES_WORDS.test(l) && !spanishOk.some((ok) => l.includes(ok)));
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
    ["name", p.name], ["sex", p.sex ?? "female"], ["age", p.age ?? 31], ["weightKg", p.weightKg ?? 60], ["heightCm", p.heightCm ?? 166],
    ["focus", p.focus ?? "ambos"], ["level", p.level ?? "principiante"], ["yearsRunning", p.yearsRunning ?? 0], ["weeklyKm", p.weeklyKm ?? 10],
    ["longestRunKm", p.longestRunKm ?? 6], ...(p.days ?? [0, 2, 4, 6]).map((d) => ["availableDays", d]), ["longRunDay", p.longRunDay ?? 6],
    ["strengthPerWeek", p.strengthPerWeek ?? 2], ["strengthStyle", p.strengthStyle ?? "general"], ["injuries", p.injuries ?? ""],
  ]);

const PAGES = ["/", "/plan", "/plan/actual", "/plan/al-momento", "/fuerza", "/perfil", "/perfil?tab=running", "/perfil?tab=fuerza", "/perfil?tab=actividades", "/perfil?tab=salud", "/estadisticas", "/registrar", "/entrenador", "/amigos", "/carreras"];

// ---------- 1. Novata que prepara su primer 10K ----------
async function novata() {
  const who = "prueba-caso-novata", L = "es";
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
  await act(who, L, "medida", "src/app/strength-actions.ts#saveMeasurement", [{}, form({ date: today, weightKg: "60.5" })]);
  await act(who, L, "objetivo", "src/app/progress-actions.ts#addSuggestedTarget", []);
  await act(who, L, "al-momento", "src/app/progress-actions.ts#addInstantSession", [{}, form({ mode: "facil", i: "0" })]);
  const t0 = Date.parse(`${today}T07:00:00`);
  const pts = Array.from({ length: 181 }, (_, k) => ({ t: t0 + k * 3000, lat: 37.2 + k * 5.1e-5, lon: -3.6, alt: 640 + 5 * Math.sin(k / 30), acc: 6 }));
  await act(who, L, "gps", "src/app/actions.ts#saveRecordedRun", [{ sport: "run", name: "Vuelta al parque", startLocal: `${today}T07:00:00`, points: pts, rpe: 5 }]);
  db = readDb(who);
  const gps = db.activities.find((a) => a.name === "Vuelta al parque");
  check(who, "gps", gps && gps.distanceM > 900 && gps.efforts?.[400], JSON.stringify(gps)?.slice(0, 160));
  check(who, "objetivo", db.targets?.length === 1, JSON.stringify(db.targets));
  check(who, "actividades", db.activities.length === 2, db.activities.map((a) => a.name).join(","));
  for (const p of ["/", "/estadisticas", "/plan/actual", `/actividad/${gps?.id}`]) await page(who, L, p);
}

// ---------- 2. Lesionado que no puede entrenar unos días ----------
async function lesionado() {
  const who = "prueba-caso-lesion", L = "es";
  addUser(who, "Pablo Lesión");
  await act(who, L, "perfil", "src/app/actions.ts#saveProfile", [{}, profileForm({ name: "Pablo Lesión", sex: "male", age: 42, weightKg: 78, heightCm: 178, level: "intermedio", yearsRunning: 5, weeklyKm: 35, longestRunKm: 16, days: [0, 1, 3, 5, 6], longRunDay: 6, injuries: "tendinitis rotuliana" })]);
  await act(who, L, "carrera", "src/app/actions.ts#saveGoal", [{}, form({ name: "Media de primavera", date: day(120), distanceKm: "21.0975", targetTime: "1:45:00" })]);
  let db = readDb(who);
  const next = db.plan.weeks.flatMap((w) => w.sessions).find((s) => s.date > today && s.date <= day(14) && s.type !== "strength");
  // una semana sin poder
  await act(who, L, "bloquear", "src/app/actions.ts#markUnavailable", [{}, form({ from: day(1), to: day(7) })]);
  db = readDb(who);
  const inBlocked = db.plan.weeks.flatMap((w) => w.sessions).filter((s) => s.date >= day(1) && s.date <= day(7) && s.type !== "race");
  check(who, "bloquear", inBlocked.length === 0 && (db.unavailableDates ?? []).length === 7, inBlocked.map((s) => `${s.date}:${s.type}`).join(" "));
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
  const who = "prueba-caso-fuerza", L = "es";
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
  const who = "prueba-caso-temporada", L = "es";
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
  const who = `prueba-caso-${L}`;
  addUser(who, "Emma English");
  await act(who, L, "idioma", "src/app/lang-actions.ts#setLanguage", [form({ lang: L })]);
  await act(who, L, "perfil", "src/app/actions.ts#saveProfile", [{}, profileForm({ name: "Emma English", level: "intermedio", yearsRunning: 3, weeklyKm: 30, longestRunKm: 14, days: [1, 3, 5, 6], longRunDay: 6 })]);
  await act(who, L, "carrera", "src/app/actions.ts#saveGoal", [{}, form({ name: "London Half", date: day(84), distanceKm: "21.0975", targetTime: "1:55:00" })]);
  await act(who, L, "registrar", "src/app/actions.ts#saveActivity", [{}, form({ date: day(-2), time: "08:00", sport: "run", name: "Morning run", distanceKm: "8", duration: "46:00", feel: "bien" })]);
  await act(who, L, "fuerza", "src/app/strength-actions.ts#finishWorkout", [{ name: "Legs", startLocal: `${day(-1)}T18:00:00`, durationSec: 2400, rpe: 7, workout: { exercises: [{ exerciseId: "Goblet_Squat", sets: [{ kg: 16, reps: 10, done: true }] }] } }]);
  await act(who, L, "objetivo", "src/app/progress-actions.ts#addTarget", [{}, form({ period: "month", metric: "km", sport: "run", value: "100" })]);
  const db = readDb(who);
  check(who, "idioma", db.lang === L, db.lang);
  // nombres propios o del usuario; la guía del atajo de Salud del iPhone sigue en español (apuntado en el Roadmap);
  // los tipos de carrera de Cruzando la Meta son de su web
  const ok = ["Emma", "London", "Morning", "Legs", "Zancavolt", "Carrera urbana"];
  const guide = L !== "es";
  for (const p of PAGES.filter((x) => !(guide && x === "/perfil?tab=salud"))) await page(who, L, p, { spanishOk: ok });
  await page(who, L, "/perfil?tab=salud", { spanishOk: [""] }); // abre bien, aunque la guía siga en español
  for (const a of db.activities) await page(who, L, `/actividad/${a.id}`, { spanishOk: ok });
}

// ---------- 6. Dos amigos ----------
async function amigos() {
  const a = "prueba-caso-amiga", b = "prueba-caso-amigo", L = "es";
  addUser(a, "Sara Amiga");
  addUser(b, "Dani Amigo");
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
  const c = "prueba-caso-extrano";
  addUser(c, "Extraño");
  steps++;
  const res = await fetch(`${BASE}/amigos/${a}`, { headers: { cookie: cookieFor(c) }, redirect: "manual" });
  const html = await res.text();
  if (res.status === 200 && html.includes("Rodaje con Dani")) bad(c, "privacidad", "ve-entrenos-ajenos", "");
  await act(a, L, "dejar", "src/app/auth-actions.ts#unfriend", [form({ id: b })]);
  check(a, "dejar", !JSON.parse(readFileSync(USERS, "utf8")).users.find((u) => u.id === a)?.friends.includes(b), "");
}

const t0 = Date.now();
for (const [name, fn] of Object.entries({ novata, lesionado, fuerza, temporada, ingles: () => otroIdioma("en"), frances: () => otroIdioma("fr"), amigos })) {
  const before = problems.length;
  try {
    await fn();
  } catch (e) {
    bad(name, "script", "excepcion", e.stack?.split("\n").slice(0, 3).join(" | "));
  }
  console.log(`${name}: ${problems.length - before} problemas`);
}
writeFileSync(OUT, JSON.stringify({ pasos: steps, problemas: problems, acciones: log }, null, 2));
console.log(`Hecho: ${steps} comprobaciones en ${Math.round((Date.now() - t0) / 1000)} s · ${problems.length} problemas`);
for (const p of problems.slice(0, 60)) console.log(`  ${p.who} · ${p.step} · ${p.kind} · ${p.detail}`);
