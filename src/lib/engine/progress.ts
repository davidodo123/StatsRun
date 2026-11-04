// «Progreso» de Estadísticas (como el de Strava): la semana y las 12 anteriores, mejores tiempos con medalla,
// esfuerzo de la semana frente a su rango, tendencia de la predicción y objetivos de semana, mes o año.
import { addDays, diffDays, mondayOf } from "../dates";
import type { Activity, Profile, SportKind, Target } from "../types";
import { activityLoad } from "./load";
import { enduranceAdjustedTime } from "./physiology";
import { estimateVdot } from "./stats";
import { EFFORT_DISTANCES, type EffortDistance } from "./streams";

export interface WeekSummary {
  week: string; // lunes
  km: number;
  sec: number;
  elev: number;
  count: number;
}

/** Distancia, tiempo, desnivel y nº de actividades de cada una de las últimas `n` semanas (la última, la actual). */
export function weeklyProgress(acts: Activity[], today: string, sport: SportKind | "all", n = 12): WeekSummary[] {
  const monday = mondayOf(today);
  const weeks = Array.from({ length: n }, (_, i): WeekSummary => ({ week: addDays(monday, -7 * (n - 1 - i)), km: 0, sec: 0, elev: 0, count: 0 }));
  const first = weeks[0].week;
  for (const a of acts) {
    if (a.date < first || a.date > addDays(monday, 6) || (sport !== "all" && a.sport !== sport)) continue;
    const w = weeks[Math.floor(diffDays(a.date, first) / 7)];
    if (!w) continue;
    w.km += a.distanceM / 1000;
    w.sec += a.movingSec;
    w.elev += a.elevationGainM;
    w.count++;
  }
  return weeks.map((w) => ({ ...w, km: Math.round(w.km * 10) / 10, elev: Math.round(w.elev) }));
}

export interface BestTime {
  distance: EffortDistance;
  sec: number;
  activityId: string;
  name: string;
  date: string;
  medal: 1 | 2;
}

/** El mejor y el segundo mejor tiempo de cada distancia, de los mejores esfuerzos guardados de cada carrera. */
export function bestTimes(acts: Activity[], distances: readonly EffortDistance[] = EFFORT_DISTANCES): BestTime[] {
  const out: BestTime[] = [];
  for (const d of distances) {
    const ranked = acts
      .filter((a) => a.sport === "run" && a.efforts?.[d] !== undefined)
      .map((a) => ({ a, sec: a.efforts![d]! }))
      .sort((x, y) => x.sec - y.sec)
      .slice(0, 2);
    ranked.forEach((r, i) => out.push({ distance: d, sec: r.sec, activityId: r.a.id, name: r.a.name, date: r.a.date, medal: (i + 1) as 1 | 2 }));
  }
  return out;
}

export interface WeekEffort {
  score: number; // carga de esta semana hasta hoy
  lastWeek: number;
  range: [number, number]; // lo recomendado para la semana, con las 4 anteriores
  daily: number[]; // carga acumulada de lunes a domingo (hasta hoy)
}

/**
 * Esfuerzo de la semana (como el «esfuerzo relativo» de Strava) con la carga de cada actividad:
 * el rango recomendado va del 80 % al 130 % de la media de las 4 semanas anteriores (la zona segura del ratio agudo/crónico).
 */
export function weekEffort(acts: Activity[], profile: Profile, vdot: number, today: string): WeekEffort {
  const monday = mondayOf(today);
  const loadIn = (from: string, to: string) => acts.filter((a) => a.date >= from && a.date <= to).reduce((s, a) => s + activityLoad(a, profile, vdot), 0);
  const prev = [1, 2, 3, 4].map((k) => loadIn(addDays(monday, -7 * k), addDays(monday, -7 * k + 6)));
  const avg = prev.reduce((a, b) => a + b, 0) / 4;
  const daily: number[] = [];
  let acc = 0;
  for (let i = 0; i < 7; i++) {
    const day = addDays(monday, i);
    if (day > today) break;
    acc += loadIn(day, day);
    daily.push(Math.round(acc));
  }
  return { score: Math.round(acc), lastWeek: Math.round(prev[0]), range: [Math.round(avg * 0.8), Math.round(avg * 1.3)], daily };
}

/**
 * Tiempo previsto para una distancia cada semana de las últimas `weeks` (con lo corrido hasta ese día).
 * Empieza en su primera carrera: antes la predicción salía solo del perfil y comparar con ella engañaba
 * («23:41 más lento que hace un mes» a quien acaba de empezar).
 */
export function predictionTrend(acts: Activity[], profile: Profile | undefined, today: string, km: number, weeks = 6): { date: string; sec: number }[] {
  const firstRun = acts.filter((a) => a.sport === "run" && a.date <= today).reduce<string | undefined>((m, a) => (!m || a.date < m ? a.date : m), undefined);
  const points = Array.from({ length: weeks + 1 }, (_, i) => {
    const date = addDays(today, -7 * (weeks - i));
    const upTo = acts.filter((a) => a.date <= date);
    const vdot = estimateVdot(upTo, profile, date).vdot;
    const runKm = upTo.filter((a) => a.sport === "run" && diffDays(date, a.date) < 42).reduce((s, a) => s + a.distanceM / 1000, 0);
    return { date, sec: Math.round(enduranceAdjustedTime(vdot, km, runKm / 6).timeSec) };
  });
  const kept = firstRun ? points.filter((p) => p.date >= firstRun) : [];
  return kept.length ? kept : points.slice(-1);
}

/** Lo que lleva hecho de un objetivo en su periodo actual (semana desde el lunes, mes o año naturales). */
export function targetProgress(acts: Activity[], target: Target, today: string): { done: number; from: string; to: string } {
  const from = target.period === "week" ? mondayOf(today) : target.period === "month" ? `${today.slice(0, 7)}-01` : `${today.slice(0, 4)}-01-01`;
  const to = target.period === "week" ? addDays(from, 6) : target.period === "month" ? addDays(`${addDays(from, 32).slice(0, 7)}-01`, -1) : `${today.slice(0, 4)}-12-31`;
  const mine = acts.filter((a) => a.date >= from && a.date <= to && (target.sport === "all" || a.sport === target.sport));
  const done =
    target.metric === "km" ? mine.reduce((s, a) => s + a.distanceM / 1000, 0)
    : target.metric === "hours" ? mine.reduce((s, a) => s + a.movingSec / 3600, 0)
    : target.metric === "elev" ? mine.reduce((s, a) => s + a.elevationGainM, 0)
    : mine.length;
  return { done: Math.round(done * 10) / 10, from, to };
}

/** Objetivo sugerido: carreras por semana, con lo que viene haciendo las últimas 4 semanas (redondeado hacia arriba). */
export function suggestedTarget(acts: Activity[], today: string): Target {
  const from = addDays(mondayOf(today), -28);
  const runs = acts.filter((a) => a.sport === "run" && a.date >= from && a.date < mondayOf(today)).length;
  return { id: "sugerido", period: "week", metric: "count", sport: "run", value: Math.min(7, Math.max(2, Math.ceil(runs / 4))) };
}
