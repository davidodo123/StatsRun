// Usuario DEMO para el vídeo promocional: «Lucía Martín» y 4 amigos ficticios, solo en los datos locales (data/).
// Todos los correos son @demo.run-in-out.test y los ids empiezan por «demo-video-»: así se borran con `--borrar`.
// La contraseña no se guarda en ningún archivo: llega en la variable DEMO_PASS al ejecutar.
//
//   DEMO_PASS=... npx jiti scripts/demo-video/seed.ts      crea (o rehace) los usuarios demo
//   npx jiti scripts/demo-video/seed.ts --borrar           los quita
import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { generatePlan } from "../../src/lib/engine/planner";
import { trainingPaces } from "../../src/lib/engine/physiology";
import { addDays, weekday } from "../../src/lib/dates";
import { encodePolyline, type LatLon } from "../../src/lib/route";
import type { Activity, Db, DailyHealth, PlannedSession, Profile, WorkoutExercise } from "../../src/lib/types";
import { planText } from "../../src/lib/i18n/planText";

// DEMO_LANG=en: nombres de entrenos, carrera y rutinas en inglés (para el vídeo en inglés)
const EN = process.env.DEMO_LANG === "en";
const L = (es: string, en: string) => (EN ? en : es);

const DATA = path.join(process.cwd(), "data");
const USERS = path.join(DATA, "users.json");
const DOMAIN = "demo.run-in-out.test";
const PREFIX = "demo-video-";

interface UserRow {
  id: string;
  username: string;
  name: string;
  email?: string;
  passHash?: string;
  salt?: string;
  emailVerified?: boolean;
  createdAt: string;
  friendCode: string;
  friends: string[];
}

const users = (): { users: UserRow[] } => JSON.parse(readFileSync(USERS, "utf8"));
const isDemo = (u: UserRow) => u.id.startsWith(PREFIX) || u.email?.endsWith(`@${DOMAIN}`);

function borrar() {
  const doc = users();
  for (const u of doc.users.filter(isDemo)) rmSync(path.join(DATA, `db_${u.id}.json`), { force: true });
  doc.users = doc.users.filter((u) => !isDemo(u)).map((u) => ({ ...u, friends: u.friends.filter((f) => !f.startsWith(PREFIX)) }));
  writeFileSync(USERS, JSON.stringify(doc));
}

if (process.argv.includes("--borrar")) {
  borrar();
  console.log("Usuarios demo borrados.");
  process.exit(0);
}

const pass = process.env.DEMO_PASS;
if (!pass || pass.length < 8) throw new Error("Falta DEMO_PASS (8 caracteres o más).");

// ---------- utilidades ----------
let seed = 7;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const today = new Date().toLocaleDateString("sv-SE"); // AAAA-MM-DD local
const r1 = (n: number) => Math.round(n * 10) / 10;

// recorrido «de calles» por Valencia: tramos rectos con giros casi en ángulo recto, ida y vuelta por otro lado
function loop(km: number, start: LatLon, shape = 0): string {
  const DEG_LAT = 1 / 111; // km → grados
  const DEG_LON = 1 / 86;
  const pts: LatLon[] = [start];
  let [lat, lon] = start;
  let heading = shape * 2.1; // radianes
  const half = km / 2;
  let done = 0;
  // ida: tramos de 300-900 m girando ±70-110°, con tendencia a alejarse
  while (done < half) {
    const seg = Math.min(half - done, 0.3 + rnd() * 0.6);
    const steps = Math.max(2, Math.round(seg / 0.08));
    for (let i = 0; i < steps; i++) {
      const wobble = (rnd() - 0.5) * 0.08;
      lat += (seg / steps) * Math.cos(heading + wobble) * DEG_LAT;
      lon += (seg / steps) * Math.sin(heading + wobble) * DEG_LON;
      pts.push([lat, lon]);
    }
    done += seg;
    heading += (rnd() < 0.5 ? -1 : 1) * (Math.PI / 2) * (0.35 + rnd() * 0.3);
  }
  // vuelta: hacia la salida en tramos, primero en una dirección y luego en la otra (como por calles)
  for (let k = 0; k < 3; k++) {
    const dLat = start[0] - lat;
    const dLon = start[1] - lon;
    const target: LatLon = k % 2 === 0 ? [lat + dLat * 0.6, lon] : [lat, lon + dLon * 0.8];
    if (k === 2) target.splice(0, 2, ...start);
    const steps = 12;
    const [fLat, fLon] = [lat, lon];
    for (let i = 1; i <= steps; i++) {
      lat = fLat + ((target[0] - fLat) * i) / steps + (rnd() - 0.5) * 0.00008;
      lon = fLon + ((target[1] - fLon) * i) / steps + (rnd() - 0.5) * 0.00008;
      pts.push([lat, lon]);
    }
  }
  return encodePolyline(pts);
}
// salidas: Jardín del Turia (Alameda), Ruzafa, Benimaclet y Campanar
const PLACES: LatLon[] = [
  [39.4735, -0.3637],
  [39.4618, -0.3729],
  [39.4862, -0.3591],
  [39.4806, -0.3925],
];

const HR = { easy: 138, recovery: 132, long: 145, tempo: 160, intervals: 166, race: 174 } as Record<string, number>;

function run(id: string, date: string, name: string, km: number, paceSec: number, hr: number, opts: Partial<Activity> = {}): Activity {
  const moving = Math.round(km * paceSec);
  return {
    id,
    source: "strava",
    name,
    sport: "run",
    sportRaw: "Run",
    date,
    startLocal: `${date}T07:${String(10 + Math.floor(rnd() * 40)).padStart(2, "0")}:00`,
    distanceM: Math.round(km * 1000),
    movingSec: moving,
    elapsedSec: Math.round(moving * 1.04),
    elevationGainM: Math.round(20 + rnd() * 60 + km * 3),
    avgHr: Math.round(hr + (rnd() - 0.5) * 6),
    maxHr: Math.round(hr + 12 + rnd() * 6),
    avgCadence: Math.round(168 + rnd() * 10),
    route: loop(km, PLACES[Math.floor(rnd() * PLACES.length)], rnd() * 3),
    ...opts,
  };
}

function strength(id: string, date: string, name: string, kind: "pierna" | "superior", bodyKg: number): Activity {
  const ex = (exerciseId: string, nameEs: string, kg: number | undefined, reps: number, n = 3, bw = false): WorkoutExercise => ({
    exerciseId,
    name: nameEs,
    bw: bw || undefined,
    bodyKg: bw ? bodyKg : undefined,
    sets: Array.from({ length: n }, () => ({ kg, reps, rir: 2 })),
  });
  const exercises =
    kind === "pierna"
      ? [
          ex("Barbell_Squat", "Sentadilla trasera con barra", 45, 8),
          ex("Romanian_Deadlift", "Peso muerto rumano", 40, 10),
          ex("Barbell_Hip_Thrust", "Hip thrust con barra", 60, 10),
          ex("Dumbbell_Lunges", "Zancada con mancuernas", 10, 10),
          ex("Standing_Calf_Raises", "Gemelo de pie en máquina", 40, 15),
        ]
      : [
          ex("Pushups", "Flexiones", undefined, 12, 3, true),
          ex("Bent_Over_Barbell_Row", "Remo con barra inclinado", 30, 10),
          ex("Dumbbell_Bench_Press", "Press de banca con mancuernas", 12, 10),
          ex("Plank", "Plancha", undefined, 45, 3, true),
          ex("Side_Bridge", "Plancha lateral", undefined, 30, 2, true),
        ];
  return {
    id,
    source: "manual",
    name,
    sport: "strength",
    sportRaw: "WeightTraining",
    date,
    startLocal: `${date}T19:00:00`,
    distanceM: 0,
    movingSec: 2700 + Math.round(rnd() * 600),
    elapsedSec: 3300,
    elevationGainM: 0,
    avgHr: 112,
    rpe: 7,
    workout: { exercises },
  };
}

function health(days: number): DailyHealth[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, -(days - 1 - i));
    return {
      date,
      steps: Math.round(8500 + rnd() * 6000),
      activeKcal: Math.round(420 + rnd() * 380),
      restingKcal: 1350,
      hrvMs: Math.round(58 + rnd() * 14),
      restingHr: Math.round(50 + rnd() * 4),
      sleepHours: r1(6.8 + rnd() * 1.4),
      updatedAt: new Date().toISOString(),
    };
  });
}

function routine(id: string, name: string, kind: "pierna" | "superior" | "completo", list: [string, number | undefined, number][]) {
  const at = `${addDays(today, -60)}T10:00:00.000Z`;
  return {
    id: `${PREFIX}${id}`,
    name,
    kind,
    folder: L("Gimnasio", "Gym"),
    exercises: list.map(([exerciseId, kg, reps]) => ({ exerciseId, bw: kg === undefined || undefined, restSec: 90, sets: [{ kg, reps }, { kg, reps }, { kg, reps }] })),
    createdAt: at,
    updatedAt: at,
  };
}

// ---------- Lucía: plan de media maratón empezado hace 5 semanas, carrera dentro de 10 ----------
const planStart = addDays(today, -35);
const lucia: Profile = {
  name: "Lucía Martín",
  sex: "female",
  age: 31,
  weightKg: 58,
  heightCm: 166,
  hrMax: 189,
  hrRest: 51,
  level: "intermedio",
  yearsRunning: 3,
  weeklyKm: 30,
  longestRunKm: 14,
  recentRace: { distanceKm: 10, timeSec: 49 * 60 + 12 },
  daysPerWeek: 5,
  availableDays: [0, 1, 3, 4, 6],
  longRunDay: 6,
  strengthPerWeek: 2,
  strengthStyle: "general",
  focus: "ambos",
};
const goal = { name: L("Media Maratón de Reyes", "Spring Half Marathon"), distanceKm: 21.0975, date: addDays(today, 70), targetTimeSec: 1 * 3600 + 47 * 60 };
const plan = generatePlan({ profile: lucia, goal, currentVdot: 41, currentWeeklyKm: 30, longestRecentKm: 14, today: planStart });
plan.createdAt = `${planStart}T09:00:00.000Z`;

// 12 semanas de historial «de Strava» antes del plan, con algo menos de volumen
const acts: Activity[] = [];
const p0 = trainingPaces(39);
for (let i = 84; i >= 1; i--) {
  const date = addDays(planStart, -i);
  const wd = weekday(date);
  if (rnd() < 0.1) continue;
  const prog = 1 - i / 84;
  if (wd === 1) acts.push(run(`${PREFIX}h${i}`, date, L("Rodaje con cambios", "Run with pickups"), r1(6 + prog * 2), p0.easy.fast - 5, 150));
  else if (wd === 3) acts.push(run(`${PREFIX}h${i}`, date, L("Rodaje suave", "Easy run"), r1(6 + rnd() * 2), p0.easy.slow - 10, HR.easy));
  else if (wd === 6) acts.push(run(`${PREFIX}h${i}`, date, L("Tirada larga", "Long run"), r1(10 + prog * 4 + rnd()), p0.easy.slow - 5, HR.long));
  else if (wd === 4 && rnd() < 0.5) acts.push(strength(`${PREFIX}h${i}`, date, L("Fuerza: tren inferior", "Strength: lower body"), "pierna", 58));
}
acts.push(run(`${PREFIX}10k`, addDays(planStart, -20), L("10K Ruzafa", "Ruzafa 10K"), 10, (49 * 60 + 12) / 10, HR.race, { prCount: 2 }));

// lo hecho del plan: casi todo, con ritmos dentro del rango y alguna sesión saltada (punto rojo del calendario)
const titles: Record<string, string> = EN
  ? { easy: "Easy run", recovery: "Recovery run", long: "Long run", tempo: "Threshold run", intervals: "Intervals", race: "Race" }
  : { easy: "Rodaje suave", recovery: "Rodaje regenerativo", long: "Tirada larga", tempo: "Umbral", intervals: "Series", race: "Carrera" };
let n = 0;
for (const s of plan.weeks.flatMap((w) => w.sessions) as PlannedSession[]) {
  if (s.date >= today) continue;
  n++;
  if (n === 9 || n === 23) continue; // dos sesiones sin hacer
  if (s.type === "strength") {
    acts.push(strength(`${PREFIX}p${n}`, s.date, planText(s.title, EN ? "en" : "es") || L("Fuerza", "Strength"), s.strengthKind === "superior" ? "superior" : "pierna", 58));
    continue;
  }
  // ritmo medio de toda la sesión (calentamiento y vuelta a la calma incluidos), no el de las series
  const pace = (s.durationMin * 60) / s.distanceKm + (rnd() - 0.3) * 6;
  const km = r1(s.distanceKm * (0.97 + rnd() * 0.07));
  acts.push(run(`${PREFIX}p${n}`, s.date, titles[s.type] ?? planText(s.title, EN ? "en" : "es"), km, pace, HR[s.type] ?? 145, { sessionId: s.id, rpe: s.type === "easy" ? 4 : 7, feel: "bien" }));
}
// un 5K popular hace 9 días, más rápido que el 10K de septiembre: se ve el progreso (VDOT ~43)
acts.push(run(`${PREFIX}5k`, addDays(today, -9), L("5K popular del Turia", "Turia 5K"), 5, (22 * 60 + 35) / 5, HR.race, { prCount: 1 }));
acts.sort((a, b) => a.startLocal.localeCompare(b.startLocal));

const luciaDb: Db = {
  profile: lucia,
  goal,
  plan,
  activities: acts,
  health: health(42),
  lastSync: new Date().toISOString(),
  lang: EN ? "en" : "es",
  places: [{ id: "gym", name: L("Gimnasio", "Gym"), equipment: ["corporal", "mancuernas", "barra", "kettlebell", "bandas", "banco", "dominadas", "cajon", "jaula", "maquinas", "poleas", "balon", "fitball", "rodillo"] }],
  activePlaceId: "gym",
  routines: [
    routine("r1", L("Pierna para corredores", "Legs for runners"), "pierna", [
      ["Barbell_Squat", 45, 8],
      ["Romanian_Deadlift", 40, 10],
      ["Barbell_Hip_Thrust", 60, 10],
      ["Standing_Calf_Raises", 40, 15],
    ]),
    routine("r2", L("Tren superior y core", "Upper body and core"), "superior", [
      ["Pushups", undefined, 12],
      ["Bent_Over_Barbell_Row", 30, 10],
      ["Dumbbell_Bench_Press", 12, 10],
      ["Plank", undefined, 45],
    ]),
    routine("r3", L("Cuerpo entero exprés", "Express full body"), "completo", [
      ["Dumbbell_Lunges", 10, 10],
      ["Pullups", undefined, 6],
      ["Side_Bridge", undefined, 30],
    ]),
  ],
  measurements: [
    { date: addDays(today, -42), weightKg: 59.1, fatPct: 23.5, waistCm: 70 },
    { date: addDays(today, -21), weightKg: 58.4, fatPct: 22.8, waistCm: 69 },
    { date: addDays(today, -2), weightKg: 57.9, fatPct: 22.1, waistCm: 68.5 },
  ],
};

// ---------- amigos ----------
const friends = [
  { slug: "marcos", name: "Marcos Ruiz", sex: "male" as const, vdot: 47, km: 45 },
  { slug: "elena", name: "Elena Vidal", sex: "female" as const, vdot: 43, km: 35 },
  { slug: "javi", name: "Javi Ortega", sex: "male" as const, vdot: 40, km: 25 },
  { slug: "nuria", name: "Nuria Campos", sex: "female" as const, vdot: 45, km: 40 },
];
function friendDb(f: (typeof friends)[number], k: number): Db {
  const p = trainingPaces(f.vdot);
  const list: Activity[] = [];
  for (let i = 28; i >= 0; i--) {
    const date = addDays(today, -i);
    const wd = weekday(date);
    if ((wd + k) % 7 === 2 || rnd() < 0.25) continue;
    if (wd === 6) list.push(run(`${PREFIX}${f.slug}-${i}`, date, L("Tirada larga", "Long run"), r1(f.km / 3 + rnd() * 3), p.easy.slow - 5, HR.long));
    else if (wd === (k % 2 ? 1 : 3)) list.push(run(`${PREFIX}${f.slug}-${i}`, date, L("Series 6×800", "Intervals 6×800"), r1(8 + rnd() * 2), p.interval.slow + 25, HR.intervals));
    else if (wd === 4 && k % 2) list.push(strength(`${PREFIX}${f.slug}-${i}`, date, L("Fuerza en el gimnasio", "Gym strength"), k % 4 ? "superior" : "pierna", 70));
    else list.push(run(`${PREFIX}${f.slug}-${i}`, date, L("Rodaje", "Easy run"), r1(f.km / 6 + rnd() * 3), p.easy.slow - 10, HR.easy));
  }
  return {
    profile: { ...lucia, name: f.name, sex: f.sex, age: 28 + k * 3, weightKg: f.sex === "male" ? 72 : 57, heightCm: f.sex === "male" ? 178 : 164, weeklyKm: f.km },
    activities: list,
    lang: EN ? "en" : "es",
  };
}

// ---------- escribir ----------
borrar();
const doc = users();
const codes = ["DEMOLM", "DEMOMR", "DEMOEV", "DEMOJO", "DEMONC"];
const mk = (slug: string, name: string, i: number): UserRow => {
  const salt = randomBytes(16).toString("hex");
  return {
    id: `${PREFIX}${slug}`,
    username: `${PREFIX}${slug}`,
    name,
    email: `${slug}@${DOMAIN}`,
    passHash: scryptSync(pass, salt, 64).toString("hex"),
    salt,
    emailVerified: false,
    createdAt: `${addDays(today, -120 + i)}T10:00:00.000Z`,
    friendCode: codes[i],
    friends: [],
  };
};
const rows = [mk("lucia", "Lucía Martín", 0), ...friends.map((f, i) => mk(f.slug, f.name, i + 1))];
rows[0].friends = rows.slice(1).map((u) => u.id);
for (const u of rows.slice(1)) u.friends = [rows[0].id, ...rows.slice(1).filter((x) => x !== u).map((x) => x.id)];
doc.users.push(...rows);
writeFileSync(USERS, JSON.stringify(doc));
writeFileSync(path.join(DATA, `db_${PREFIX}lucia.json`), JSON.stringify(luciaDb));
friends.forEach((f, k) => writeFileSync(path.join(DATA, `db_${PREFIX}${f.slug}.json`), JSON.stringify(friendDb(f, k))));
console.log(`Lucía: ${acts.length} actividades, plan de ${plan.weeks.length} semanas (empezó ${planStart}), carrera ${goal.date}.`);
console.log(`Correo para entrar: lucia@${DOMAIN}`);
if (!existsSync(USERS)) throw new Error("No se escribió users.json");
