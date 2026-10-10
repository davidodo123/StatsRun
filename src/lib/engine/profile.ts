// Datos de la página de perfil: mejores tiempos, medias por periodo, fuerza, logros y promedios para el perfil.
import type { Activity } from "../types";
import { addDays, diffDays, mondayOf } from "../dates";
import type { SessionMatch } from "./planner";
import { runs } from "./stats";
import type { IconName } from "../../components/icons";

const isStrength = (a: Activity) => a.sport === "strength";
const inWindow = (a: Activity, today: string, from: number, to: number) => a.date <= today && diffDays(today, a.date) >= from && diffDays(today, a.date) < to;
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

// ---------------- Mejores tiempos ----------------

export interface BestTime {
  label: string;
  km: number;
  timeSec: number;
  paceSec: number;
  activity: Activity;
  /** La actividad es de esa distancia (hasta +10 %); si no, el tiempo se estima con el ritmo medio de una más larga. */
  exact: boolean;
}

export const BEST_DISTANCES = [
  { label: "5K", km: 5 },
  { label: "10K", km: 10 },
  { label: "Media maratón", km: 21.0975 },
  { label: "Maratón", km: 42.195 },
];

/** Mejor ritmo medio en carreras de al menos esa distancia (margen GPS del 3 %), llevado a la distancia exacta. */
export function bestTimes(acts: Activity[]): BestTime[] {
  const out: BestTime[] = [];
  for (const d of BEST_DISTANCES) {
    const c = runs(acts).filter((a) => a.distanceM >= d.km * 970 && a.movingSec > 0);
    if (!c.length) continue;
    const best = c.reduce((b, a) => (a.movingSec / a.distanceM < b.movingSec / b.distanceM ? a : b));
    const paceSec = best.movingSec / (best.distanceM / 1000);
    out.push({ ...d, timeSec: paceSec * d.km, paceSec, activity: best, exact: best.distanceM <= d.km * 1100 });
  }
  return out;
}

// ---------------- Medias por periodo (tabla de mejora) ----------------

export interface PeriodAvg {
  label: string;
  kmPerWeek: number;
  runsPerWeek: number;
  /** seg/km */
  avgPace?: number;
  avgHr?: number;
  /** Efficiency Factor: velocidad (m/min) ÷ FC */
  ef?: number;
  cadence?: number;
  longestKm: number;
  strengthPerWeek: number;
}

function periodAvg(acts: Activity[], today: string, from: number, to: number, label: string): PeriodAvg {
  const weeks = (to - from) / 7;
  const rs = runs(acts).filter((a) => inWindow(a, today, from, to));
  const km = sum(rs.map((a) => a.distanceM)) / 1000;
  const sec = sum(rs.map((a) => a.movingSec));
  const withHr = rs.filter((a) => a.avgHr);
  const hrSec = sum(withHr.map((a) => a.movingSec));
  const withCad = rs.filter((a) => a.avgCadence);
  return {
    label,
    kmPerWeek: km / weeks,
    runsPerWeek: rs.length / weeks,
    avgPace: km > 0 ? sec / km : undefined,
    avgHr: hrSec ? sum(withHr.map((a) => a.avgHr! * a.movingSec)) / hrSec : undefined,
    // media ponderada por tiempo de (m/min ÷ FC)
    ef: hrSec ? sum(withHr.map((a) => (a.distanceM * 60) / a.avgHr!)) / hrSec : undefined,
    cadence: withCad.length ? sum(withCad.map((a) => a.avgCadence!)) / withCad.length : undefined,
    longestKm: rs.length ? Math.max(...rs.map((a) => a.distanceM)) / 1000 : 0,
    strengthPerWeek: acts.filter((a) => isStrength(a) && inWindow(a, today, from, to)).length / weeks,
  };
}

/** Últimas 4 semanas, las 4 anteriores y las 4 de antes (para ver la tendencia). */
export function periodAverages(acts: Activity[], today: string): PeriodAvg[] {
  return [
    periodAvg(acts, today, 0, 28, "Últimas 4 semanas"),
    periodAvg(acts, today, 28, 56, "4 semanas antes"),
    periodAvg(acts, today, 56, 84, "Hace 2-3 meses"),
  ];
}

// ---------------- Fuerza ----------------

export interface StrengthSummary {
  total: number;
  totalMin: number;
  last28: number;
  perWeek28: number;
  min28: number;
  last?: Activity;
  /** Sesiones por semana, últimas 12 (lunes de cada semana). */
  weeks: { week: string; count: number }[];
}

export function strengthSummary(acts: Activity[], today: string): StrengthSummary {
  const all = acts.filter((a) => isStrength(a) && a.date <= today).sort((a, b) => a.startLocal.localeCompare(b.startLocal));
  const recent = all.filter((a) => diffDays(today, a.date) < 28);
  const monday = mondayOf(today);
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const week = addDays(monday, -7 * (11 - i));
    return { week, count: all.filter((a) => mondayOf(a.date) === week).length };
  });
  return {
    total: all.length,
    totalMin: Math.round(sum(all.map((a) => a.movingSec)) / 60),
    last28: recent.length,
    perWeek28: recent.length / 4,
    min28: Math.round(sum(recent.map((a) => a.movingSec)) / 60),
    last: all[all.length - 1],
    weeks,
  };
}

// ---------------- Promedios para el perfil ----------------

export interface ProfileAverages {
  weeklyKm: number;
  longestRunKm: number;
  runDaysPerWeek: number;
  strengthPerWeek: number;
}

/** Valores del perfil calculados con las últimas 6 semanas (undefined si no hay carreras). */
export function profileAverages(acts: Activity[], today: string): ProfileAverages | undefined {
  const rs = runs(acts).filter((a) => inWindow(a, today, 0, 42));
  if (!rs.length) return undefined;
  return {
    weeklyKm: Math.round(sum(rs.map((a) => a.distanceM)) / 1000 / 6),
    longestRunKm: Math.round((Math.max(...rs.map((a) => a.distanceM)) / 1000) * 2) / 2,
    runDaysPerWeek: Math.round((new Set(rs.map((a) => a.date)).size / 6) * 10) / 10,
    strengthPerWeek: Math.round((acts.filter((a) => isStrength(a) && inWindow(a, today, 0, 42)).length / 6) * 10) / 10,
  };
}

// ---------------- Logros ----------------

export type AchievementGroup = "Distancia" | "Volumen" | "Ritmo" | "Constancia" | "Fuerza" | "Plan";

export interface Achievement {
  id: string;
  group: AchievementGroup;
  icon: IconName;
  title: string;
  detail: string;
  unlocked: boolean;
  /** Fecha en que se consiguió (si se conoce). */
  date?: string;
  /** Progreso 0-1 hacia el logro si aún no está. */
  progress: number;
}

/** Primera fecha en que el acumulado (en orden cronológico) llega a `target`. */
function reachedOn(sorted: Activity[], value: (a: Activity) => number, target: number): { date?: string; total: number } {
  let total = 0;
  for (const a of sorted) {
    total += value(a);
    if (total >= target) return { date: a.date, total };
  }
  return { total };
}

/** Racha más larga de días consecutivos con alguna actividad, y la fecha en que se alcanzó cada objetivo. */
function streakReached(sorted: Activity[], target: number): { date?: string; best: number } {
  const days = [...new Set(sorted.map((a) => a.date))].sort();
  let best = 0;
  let cur = 0;
  let prev: string | undefined;
  for (const d of days) {
    cur = prev && diffDays(d, prev) === 1 ? cur + 1 : 1;
    prev = d;
    if (cur > best) best = cur;
    if (cur >= target) return { date: d, best: cur };
  }
  return { best };
}

export function achievements(acts: Activity[], matches?: Map<string, SessionMatch>): Achievement[] {
  const sorted = [...acts].sort((a, b) => a.startLocal.localeCompare(b.startLocal));
  const rs = runs(sorted);
  const out: Achievement[] = [];
  const add = (a: Omit<Achievement, "unlocked" | "progress"> & { progress?: number }) =>
    out.push({ ...a, unlocked: Boolean(a.date) || a.progress === 1, progress: a.date ? 1 : Math.min(0.99, Math.max(0, a.progress ?? 0)) });

  // distancia en una sola carrera
  const longest = rs.length ? Math.max(...rs.map((a) => a.distanceM)) / 1000 : 0;
  add({ id: "first-run", group: "Distancia", icon: "shoe", title: "Primera carrera", detail: "Registra tu primera carrera.", date: rs[0]?.date });
  for (const [km, title, icon] of [
    [5, "5 km seguidos", "medal"],
    [10, "10 km seguidos", "medal"],
    [21.0975, "Media maratón", "medal"],
    [42.195, "Maratón", "trophy"],
  ] as const) {
    const first = rs.find((a) => a.distanceM >= km * 970);
    add({ id: `dist-${km}`, group: "Distancia", icon, title, detail: `Corre ${km < 21 ? km : km.toFixed(1)} km en una sola salida.`, date: first?.date, progress: longest / km });
  }

  // volumen acumulado
  for (const km of [50, 100, 250, 500, 1000]) {
    const r = reachedOn(rs, (a) => a.distanceM / 1000, km);
    add({ id: `total-${km}`, group: "Volumen", icon: km >= 500 ? "globe" : "trend", title: `${km} km en total`, detail: `Acumula ${km} km corriendo.`, date: r.date, progress: r.total / km });
  }
  const weekKm = new Map<string, number>();
  for (const a of rs) weekKm.set(mondayOf(a.date), (weekKm.get(mondayOf(a.date)) ?? 0) + a.distanceM / 1000);
  const bestWeek = Math.max(0, ...weekKm.values());
  for (const km of [30, 50]) {
    const week = [...weekKm.entries()].sort(([a], [b]) => a.localeCompare(b)).find(([, v]) => v >= km)?.[0];
    add({ id: `week-${km}`, group: "Volumen", icon: "calendar", title: `Semana de ${km} km`, detail: `Corre ${km} km en una misma semana (lunes a domingo).`, date: week, progress: bestWeek / km });
  }
  const climb = reachedOn(sorted, (a) => a.elevationGainM, 1000);
  add({ id: "climb-1000", group: "Volumen", icon: "mountain", title: "1.000 m de desnivel", detail: "Acumula 1.000 m de desnivel positivo.", date: climb.date, progress: climb.total / 1000 });

  // ritmo (tiempos estimados con el ritmo medio)
  const bt = bestTimes(sorted);
  for (const [label, limitSec, title] of [
    ["5K", 30 * 60, "5K en menos de 30′"],
    ["5K", 25 * 60, "5K en menos de 25′"],
    ["10K", 50 * 60, "10K en menos de 50′"],
  ] as const) {
    const t = bt.find((b) => b.label === label);
    const first = rs.find((a) => a.distanceM >= (label === "5K" ? 5 : 10) * 970 && (a.movingSec / a.distanceM) * (label === "5K" ? 5000 : 10000) < limitSec);
    add({ id: `pace-${label}-${limitSec}`, group: "Ritmo", icon: "bolt", title, detail: "Según el ritmo medio de una carrera de esa distancia o más.", date: first?.date, progress: t ? limitSec / t.timeSec : 0 });
  }

  // constancia
  for (const days of [7, 30]) {
    const s = streakReached(sorted, days);
    add({ id: `streak-${days}`, group: "Constancia", icon: "flame", title: `Racha de ${days} días`, detail: `Entrena ${days} días seguidos (cualquier deporte).`, date: s.date, progress: s.best / days });
  }
  const early = rs.find((a) => Number(a.startLocal.slice(11, 13)) < 7 && a.startLocal.length >= 13);
  add({ id: "early", group: "Constancia", icon: "sunrise", title: "Madrugador", detail: "Sal a correr antes de las 7:00.", date: early?.date });

  // fuerza
  const strength = sorted.filter(isStrength);
  for (const n of [1, 10, 50]) {
    add({ id: `strength-${n}`, group: "Fuerza", icon: "dumbbell", title: n === 1 ? "Primera sesión de fuerza" : `${n} sesiones de fuerza`, detail: "La fuerza reduce lesiones y mejora la economía de carrera.", date: strength[n - 1]?.date, progress: strength.length / n });
  }

  // plan
  if (matches) {
    const ms = [...matches.values()];
    const done = ms.filter((m) => m.status === "done").sort((a, b) => a.session.date.localeCompare(b.session.date));
    for (const n of [10, 50]) {
      add({ id: `plan-${n}`, group: "Plan", icon: "checkCircle", title: `${n} sesiones del plan`, detail: `Completa ${n} sesiones de tu plan.`, date: done[n - 1]?.session.date, progress: done.length / n });
    }
    const byWeek = new Map<string, SessionMatch[]>();
    for (const m of ms) if (m.session.type !== "race") byWeek.set(mondayOf(m.session.date), [...(byWeek.get(mondayOf(m.session.date)) ?? []), m]);
    const perfect = [...byWeek.entries()]
      .filter(([, list]) => list.length > 0 && list.every((m) => m.status === "done"))
      .map(([w, list]) => list.reduce((d, m) => (m.session.date > d ? m.session.date : d), w))
      .sort()[0];
    add({ id: "plan-perfect-week", group: "Plan", icon: "star", title: "Semana perfecta", detail: "Completa todas las sesiones de una semana del plan.", date: perfect });
  }

  return out;
}
