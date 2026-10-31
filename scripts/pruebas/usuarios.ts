// Prueba de carga y de reglas con muchos usuarios FICTICIOS, solo en los datos locales (data/), nunca en producción.
// Crea N usuarios muy distintos (perfil, objetivo, idioma, historial, casos raros), les hace el plan como la app
// (rebuildPlan en app/actions.ts) y comprueba las reglas del plan. Los ids empiezan por «prueba-» para borrarlos luego.
//
//   npx jiti scripts/pruebas/usuarios.ts 1000 <informe.json>    crea los usuarios y escribe los fallos de reglas
//   npx jiti scripts/pruebas/usuarios.ts --borrar                los quita (y sus amistades)
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { applyBlockedDates, applyTuneUpRaces, availableDaysOf, generateSeason, keepPastWeeks } from "../../src/lib/engine/planner";
import { computeStats } from "../../src/lib/engine/stats";
import { applyStrengthRoutines, routinesForPlan } from "../../src/lib/strength/routinePlan";
import { addDays, diffDays, mondayOf, weekday } from "../../src/lib/dates";
import type { Activity, Db, Goal, Profile, Routine, TuneUpRace } from "../../src/lib/types";
import catalog from "../../src/lib/strength/catalog.json";

const DATA = path.join(process.cwd(), "data");
const USERS = path.join(DATA, "users.json");
const PREFIX = "prueba-";

interface UserRow {
  id: string;
  username: string;
  name: string;
  email?: string;
  createdAt: string;
  friendCode: string;
  friends: string[];
}

const users = (): { users: UserRow[] } => JSON.parse(readFileSync(USERS, "utf8"));

function borrar() {
  for (const f of readdirSync(DATA)) if (f.startsWith(`db_${PREFIX}`)) rmSync(path.join(DATA, f), { force: true });
  const doc = users();
  doc.users = doc.users.filter((u) => !u.id.startsWith(PREFIX)).map((u) => ({ ...u, friends: u.friends.filter((f) => !f.startsWith(PREFIX)) }));
  writeFileSync(USERS, JSON.stringify(doc));
}

if (process.argv.includes("--borrar")) {
  borrar();
  console.log("Usuarios de prueba borrados.");
  process.exit(0);
}

const N = Number(process.argv[2] ?? 1000);
const OUT = process.argv[3] ?? "informe-usuarios.json";

// ---------- azar con semilla (siempre los mismos usuarios) ----------
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296), seed / 4294967296);
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
const chance = (p: number) => rnd() < p;
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const today = new Date().toLocaleDateString("sv-SE");

const NAMES = ["Ana", "Luis", "Marta", "Pablo", "Sara", "Jorge", "Lucía", "Iván", "Nuria", "Hugo", "Elena", "Raúl", "Carla", "Dani", "Paula", "Àlex", "João", "Zoé", "Ñandú", "O'Neil"];
const LANGS = ["es", "es", "es", "en", "ca", "pt", "fr", undefined];
const DISTANCES = [5, 10, 15, 21.0975, 42.195, 7.5, 30, 50, 100];
const STRENGTH_IDS = (catalog as { id: string; cat: string }[]).filter((x) => x.cat === "fuerza").map((x) => x.id);

function profileFor(i: number): Profile {
  const focus = chance(0.15) ? "fuerza" : chance(0.35) ? "running" : "ambos";
  const nDays = chance(0.02) ? 1 : int(2, 7);
  const days = [...new Set(Array.from({ length: 14 }, () => int(0, 6)))].slice(0, nDays).sort((a, b) => a - b);
  // casi siempre la tirada larga en un día disponible; a veces no (dato raro que puede llegar de antes)
  const longRunDay = chance(0.95) ? pick(days) : int(0, 6);
  const weeklyKm = pick([0, 0, 5, 10, 20, 30, 45, 60, 90, 130]);
  return {
    name: `${pick(NAMES)} Prueba ${i}`,
    sex: chance(0.5) ? "male" : "female",
    age: int(15, 80),
    weightKg: int(42, 140),
    heightCm: int(148, 205),
    level: pick(["principiante", "intermedio", "avanzado"] as const),
    yearsRunning: int(0, 30),
    weeklyKm,
    longestRunKm: Math.min(45, Math.round(weeklyKm * (0.2 + rnd() * 0.4))),
    ...(chance(0.3) ? { recentRace: { distanceKm: pick([5, 10, 21.0975]), timeSec: int(15 * 60, 2.5 * 3600) } } : {}),
    ...(chance(0.2) ? { hrMax: int(160, 205), hrRest: int(40, 75) } : {}),
    daysPerWeek: days.length,
    availableDays: days,
    longRunDay,
    strengthPerWeek: focus === "fuerza" ? int(1, 6) : int(0, 4),
    strengthStyle: chance(0.3) ? "grupos" : "general",
    ...(chance(0.1) ? { injuries: "rodilla derecha" } : {}),
    focus,
  };
}

function goalFor(): Goal {
  const distanceKm = pick(DISTANCES);
  // de 3 días a 2 años; a veces ya pasada
  const date = chance(0.05) ? addDays(today, -int(1, 60)) : addDays(today, pick([3, 5, 10, 21, 45, 70, 100, 140, 200, 365, 730]));
  return { name: `Carrera ${distanceKm} km`, distanceKm, date, ...(chance(0.4) ? { targetTimeSec: Math.round(distanceKm * int(180, 480)) } : {}) };
}

function activitiesFor(p: Profile): Activity[] {
  if (chance(0.3)) return [];
  const out: Activity[] = [];
  const n = int(1, 80);
  for (let k = 0; k < n; k++) {
    const date = addDays(today, -int(0, 200));
    if (chance(0.25)) {
      const exs = Array.from({ length: int(1, 6) }, () => pick(STRENGTH_IDS));
      out.push({
        id: `p${k}`, source: "manual", name: "Fuerza", sport: "strength", sportRaw: "Strength", date, startLocal: `${date}T19:00:00`,
        distanceM: 0, movingSec: int(600, 5400), elapsedSec: 5400, elevationGainM: 0,
        workout: { exercises: exs.map((exerciseId) => ({ exerciseId, name: exerciseId, sets: Array.from({ length: int(1, 5) }, () => ({ kg: chance(0.2) ? undefined : int(0, 200), reps: int(1, 20), done: true })) })) },
      } as Activity);
    } else {
      const km = Math.max(0.1, Math.round((p.weeklyKm / 4 + rnd() * 10) * 10) / 10);
      const pace = int(170, 600);
      out.push({
        id: `r${k}`, source: pick(["strava", "manual", "gps"] as const), name: pick(["Rodaje", "Series", "Tirada larga", ""]), sport: pick(["run", "run", "run", "walk", "ride"] as const),
        sportRaw: "Run", date, startLocal: `${date}T07:30:00`, distanceM: Math.round(km * 1000), movingSec: Math.round(km * pace), elapsedSec: Math.round(km * pace * 1.05),
        elevationGainM: int(0, 900), ...(chance(0.6) ? { avgHr: int(110, 185), maxHr: int(150, 205) } : {}), ...(chance(0.3) ? { rpe: int(1, 10) } : {}),
      } as Activity);
    }
  }
  return out;
}

function routinesFor(): Routine[] {
  if (chance(0.6)) return [];
  return Array.from({ length: int(1, 5) }, (_, k) => ({
    id: `rt${k}`, name: `Rutina ${k}`, createdAt: today, updatedAt: today,
    ...(chance(0.5) ? { planSlot: pick(["pierna", "superior", "completo", "no"] as const) } : {}),
    exercises: Array.from({ length: int(1, 6) }, () => ({ exerciseId: pick(STRENGTH_IDS), sets: [{ kg: 20, reps: 10 }, { kg: 20, reps: 10 }] })),
  })) as Routine[];
}

function racesFor(goal: Goal): TuneUpRace[] {
  return Array.from({ length: chance(0.7) ? 0 : int(1, 4) }, (_, k) => ({
    id: `c${k}`, name: `Secundaria ${k}`, distanceKm: pick([5, 10, 21.0975]),
    date: addDays(today, int(4, Math.max(5, diffDays(goal.date, today) + 120))), priority: pick(["A", "B", "C", "C"] as const),
  }));
}

// ---------- reglas del plan ----------
type Issue = { code: string; user: string; detail: string };
const issues: Issue[] = [];
const bad = (user: string, code: string, detail: string) => issues.push({ code, user, detail });

function check(id: string, db: Db) {
  const p = db.profile!;
  const plan = db.plan;
  const goalFuture = db.goal && diffDays(db.goal.date, today) >= 3;
  if (!plan) {
    if (goalFuture && p.focus !== "fuerza") bad(id, "sin-plan", `objetivo ${db.goal!.date} y no hay plan`);
    return;
  }
  if (!plan.weeks.length) bad(id, "plan-vacio", "plan sin semanas");
  const avail = new Set(availableDaysOf(p));
  const blocked = new Set((db.unavailableDates ?? []).filter((d) => d >= today));
  const raceDates = new Set([db.goal?.date, ...(db.races ?? []).map((r) => r.date)]);
  for (const w of plan.weeks) {
    if (weekday(w.start) !== 0) bad(id, "semana-no-lunes", w.start);
    const byDay = new Map<string, { run: number; str: number }>();
    for (const s of w.sessions) {
      const nums = [s.distanceKm, s.durationMin];
      if (nums.some((n) => typeof n !== "number" || !Number.isFinite(n) || n < 0)) bad(id, "numero-raro", `${s.date} ${s.title} km=${s.distanceKm} min=${s.durationMin}`);
      if (s.date < w.start || s.date > addDays(w.start, 6)) bad(id, "sesion-fuera-de-semana", `${s.date} en semana ${w.start}`);
      if (/NaN|undefined|Infinity/.test(`${s.title} ${s.description} ${s.steps.join(" ")}`)) bad(id, "texto-raro", `${s.date} ${s.title}`);
      if (s.date < today) continue;
      const d = byDay.get(s.date) ?? { run: 0, str: 0 };
      if (s.type === "strength") d.str++;
      else d.run++;
      byDay.set(s.date, d);
      if (!avail.has(weekday(s.date)) && !raceDates.has(s.date) && s.type !== "race") bad(id, "dia-no-disponible", `${s.date} (${weekday(s.date)}) ${s.type} · disponibles ${[...avail]}`);
      // la carrera va en su fecha aunque ese día se marcara «no puedo»
      if (blocked.has(s.date) && s.type !== "race") bad(id, "dia-bloqueado", `${s.date} ${s.type}`);
      // la tirada, en su día; salvo que ese día esté bloqueado o haya carrera esa semana (entonces se mueve)
      const lrDate = addDays(w.start, (p.longRunDay + 7) % 7);
      const raceWeek = w.sessions.some((x) => x.type === "race") || [...raceDates].some((d) => d && d >= w.start && d <= addDays(w.start, 6));
      if (s.type === "long" && avail.has(p.longRunDay) && weekday(s.date) !== p.longRunDay && !blocked.has(lrDate) && !raceWeek) bad(id, "tirada-otro-dia", `${s.date} (${weekday(s.date)}) en vez de ${p.longRunDay}`);
    }
    for (const [date, d] of byDay) {
      if (d.run > 1) bad(id, "dos-carreras-mismo-dia", date);
      if (d.str > 1) bad(id, "dos-fuerza-mismo-dia", date);
    }
    const str = w.sessions.filter((s) => s.type === "strength").length;
    if (str > Math.max(p.strengthPerWeek, 0)) bad(id, "fuerza-de-mas", `semana ${w.start}: ${str} de ${p.strengthPerWeek}`);
  }
  if (db.goal && db.goal.date > today && !plan.weeks.some((w) => w.sessions.some((s) => s.date === db.goal!.date && s.type === "race"))) bad(id, "sin-dia-de-carrera", db.goal.date);
  // volumen: que no se dispare de una semana a otra (más de +50 % con al menos 10 km)
  const kms = plan.weeks.map((w) => w.targetKm);
  // la primera semana empieza a mitad (hoy) y tras una de descarga se vuelve al nivel de antes: esas no cuentan
  for (let k = 2; k < kms.length; k++) {
    const prev = plan.weeks[k - 1];
    if (plan.weeks[k].recovery && kms[k] > kms[k - 1] && !plan.weeks[k].sessions.some((x) => x.type === "race")) bad(id, "descarga-sube", `semana ${k + 1}: ${kms[k - 1]} → ${kms[k]} km`);
    if (prev.recovery || prev.sessions.some((x) => x.type === "race") || plan.weeks[k].sessions.some((x) => x.type === "race")) continue;
    if (kms[k - 1] >= 10 && kms[k] > kms[k - 1] * 1.5) bad(id, "salto-de-volumen", `semana ${k + 1}: ${kms[k - 1]} → ${kms[k]} km`);
  }
}

// ---------- crear ----------
borrar();
const doc = users();
const rows: UserRow[] = [];
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const id = `${PREFIX}${String(i).padStart(4, "0")}`;
  const db: Db = { activities: [] };
  const lang = pick(LANGS);
  if (lang) db.lang = lang;
  // 8 % recién llegados (sin perfil): tienen que ver el formulario del primer perfil
  if (!chance(0.08)) {
    db.profile = profileFor(i);
    db.activities = activitiesFor(db.profile);
    db.routines = routinesFor();
    if (chance(0.85)) db.goal = goalFor();
    if (db.goal && chance(0.25)) db.races = racesFor(db.goal);
    if (chance(0.15)) db.unavailableDates = Array.from({ length: int(1, 6) }, () => addDays(today, int(-5, 40)));
    if (chance(0.3)) db.health = Array.from({ length: int(1, 30) }, (_, k) => ({ date: addDays(today, -k), updatedAt: new Date().toISOString(), steps: int(0, 30000), ...(chance(0.5) ? { sleepHours: rnd() * 10, restingHr: int(40, 80), hrvMs: int(15, 120) } : {}) }));
    // el plan, como rebuildPlan (con «Adaptar» a mitad de semana a veces, para probar keepPastWeeks)
    try {
      if (db.goal) {
        const stats = computeStats(db.activities, db.profile, today);
        if (Object.values(stats.totals).some((v) => typeof v === "number" && !Number.isFinite(v))) bad(id, "estadisticas-raras", JSON.stringify(stats.totals));
        const recent = stats.totals.avgWeeklyKm6 > 0;
        const longest = Math.max(...db.activities.filter((a) => a.sport === "run" && diffDays(today, a.date) < 30).map((a) => a.distanceM / 1000), 0);
        const aGoals = (db.races ?? []).filter((r) => r.priority === "A" && r.date > today).map((r) => ({ name: r.name, distanceKm: r.distanceKm, date: r.date }));
        const build = (day: string) => {
          const plan = generateSeason({ profile: db.profile!, goal: db.goal!, currentVdot: stats.vdot.vdot, currentWeeklyKm: recent ? stats.totals.avgWeeklyKm6 : db.profile!.weeklyKm, longestRecentKm: longest || db.profile!.longestRunKm, today: day }, aGoals);
          applyTuneUpRaces(plan, (db.races ?? []).filter((r) => r.priority !== "A"), day);
          applyBlockedDates(plan, db.unavailableDates ?? [], availableDaysOf(db.profile!), day);
          applyStrengthRoutines(plan, routinesForPlan(db), day);
          return plan;
        };
        const first = build(addDays(today, -int(0, 20)));
        db.plan = chance(0.3) ? keepPastWeeks(first, build(today), today, { perWeek: db.profile.strengthPerWeek, doneThisWeek: 0 }) : first;
      }
    } catch (e) {
      bad(id, "excepcion-plan", `${(e as Error).message}`.slice(0, 200));
    }
    check(id, db);
  }
  writeFileSync(path.join(DATA, `db_${id}.json`), JSON.stringify(db));
  rows.push({ id, username: id, name: db.profile?.name ?? id, email: `${id}@prueba.zancavolt.test`, createdAt: new Date().toISOString(), friendCode: id.slice(-6).toUpperCase(), friends: [] });
}
// amistades: cada uno con 0-5 amigos al azar (en los dos sentidos)
for (const r of rows) for (let k = 0; k < (chance(0.4) ? 0 : int(1, 5)); k++) {
  const f = pick(rows);
  if (f.id !== r.id && !r.friends.includes(f.id)) (r.friends.push(f.id), f.friends.push(r.id));
}
doc.users.push(...rows);
writeFileSync(USERS, JSON.stringify(doc));

const byCode: Record<string, { n: number; users: number; ejemplos: Issue[] }> = {};
for (const x of issues) {
  const b = (byCode[x.code] ??= { n: 0, users: 0, ejemplos: [] });
  b.n++;
  if (b.ejemplos.length < 5) b.ejemplos.push(x);
}
for (const code of Object.keys(byCode)) byCode[code].users = new Set(issues.filter((x) => x.code === code).map((x) => x.user)).size;
writeFileSync(OUT, JSON.stringify({ usuarios: N, segundos: Math.round((Date.now() - t0) / 1000), fallos: byCode }, null, 2));
console.log(`${N} usuarios en ${Math.round((Date.now() - t0) / 1000)} s · ${issues.length} fallos de reglas en ${new Set(issues.map((x) => x.user)).size} usuarios`);
for (const [code, b] of Object.entries(byCode).sort((a, b) => b[1].users - a[1].users)) console.log(`  ${code}: ${b.users} usuarios (${b.n})`);
if (!existsSync(OUT)) process.exit(1);
