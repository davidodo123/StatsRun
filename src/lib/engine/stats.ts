// Agregados y estadísticas a partir de las actividades.
import type { Activity, Profile } from "../types";
import { addDays, diffDays, mondayOf, weekday } from "../dates";
import { fmtDuration } from "../format";
import { activityLoad, acwr, fitnessSeries, monotonyStrain, type LoadPoint } from "./load";
import {
  defaultVdot,
  enduranceAdjustedTime,
  hrMaxOf,
  hrRestOf,
  hrZones,
  metKcal,
  runKcal,
  vdotFromRace,
  zoneOfHr,
} from "./physiology";

export const runs = (acts: Activity[]) => acts.filter((a) => a.sport === "run" && a.distanceM > 0);

export interface VdotEstimate {
  vdot: number;
  source: string;
  activityId?: string;
}

/**
 * VDOT actual: mejor esfuerzo de los últimos 90 días (carreras ≥ 3 km, ≥ 12 min).
 * Un rodaje suave da un VDOT bajo, así que el máximo refleja la mejor forma reciente.
 * Se descarta lo que esté muy por encima del percentil para evitar GPS erróneos.
 */
export function estimateVdot(acts: Activity[], profile: Profile | undefined, today: string): VdotEstimate {
  const candidates = runs(acts)
    .filter((a) => diffDays(today, a.date) <= 90 && a.distanceM >= 3000 && a.movingSec >= 720)
    .map((a) => ({ a, v: vdotFromRace(a.distanceM / 1000, a.movingSec) }))
    .filter((x) => x.v > 15 && x.v < 85)
    .sort((x, y) => y.v - x.v);

  const fromRace = profile?.recentRace
    ? vdotFromRace(profile.recentRace.distanceKm, profile.recentRace.timeSec)
    : undefined;

  if (candidates.length) {
    // media de los 2 mejores esfuerzos: más robusta que el máximo aislado
    const top = candidates.slice(0, 2);
    const v = top.reduce((s, x) => s + x.v, 0) / top.length;
    if (fromRace && fromRace > v) return { vdot: fromRace, source: "Marca reciente indicada en tu perfil" };
    return { vdot: v, source: `Mejores esfuerzos de los últimos 90 días (${top[0].a.name})`, activityId: top[0].a.id };
  }
  if (fromRace) return { vdot: fromRace, source: "Marca reciente indicada en tu perfil" };
  return { vdot: defaultVdot(profile?.level ?? "principiante"), source: "Estimado por tu nivel (sin marcas ni actividades)" };
}

export function activityKcal(a: Activity, weightKg: number): number {
  if (a.kilojoules) return a.kilojoules; // bici: kJ ≈ kcal (eficiencia ~24 %)
  const h = a.movingSec / 3600;
  switch (a.sport) {
    case "run":
      return runKcal(weightKg, a.distanceM / 1000, a.elevationGainM);
    case "walk":
      return metKcal(3.8, weightKg, h);
    case "ride":
      return metKcal(7.5, weightKg, h);
    case "swim":
      return metKcal(7, weightKg, h);
    case "strength":
      return metKcal(5, weightKg, h);
    default:
      return metKcal(5, weightKg, h);
  }
}

export interface WeekStat {
  week: string;
  runKm: number;
  runCount: number;
  hours: number;
  load: number;
  elevation: number;
  kcal: number;
  avgPace?: number;
  avgHr?: number;
  longestKm: number;
  byType: Record<string, number>; // horas por deporte
}

export interface MonthStat {
  month: string;
  runKm: number;
  runs: number;
  hours: number;
  elevation: number;
  kcal: number;
  avgPace?: number;
}

export interface Record_ {
  label: string;
  value: string;
  sub?: string;
  activityId?: string;
  date?: string;
}

export interface Stats {
  vdot: VdotEstimate;
  loads: Map<string, number>;
  fitness: LoadPoint[];
  today: LoadPoint;
  acwr: number;
  monotony: number;
  strain: number;
  weeks: WeekStat[];
  months: MonthStat[];
  zoneTime: { zone: number; name: string; minutes: number }[];
  weekdayKm: { day: number; km: number }[];
  sportSplit: { sport: string; hours: number; count: number }[];
  paceTrend: { week: string; pace?: number; hr?: number; ef?: number; cadence?: number }[];
  vdotTrend: { month: string; vdot: number }[];
  totals: {
    allKm: number;
    allRuns: number;
    allHours: number;
    yearKm: number;
    yearRuns: number;
    monthKm: number;
    weekKm: number;
    avgWeeklyKm6: number;
    elevation: number;
    kcal: number;
    streakDays: number;
    longestStreak: number;
    consistency: number; // % semanas con ≥1 carrera (últimas 12)
  };
  records: Record_[];
  predictions: { label: string; km: number; timeSec: number; pureSec: number; shape: number }[];
}

function lastNWeeks(today: string, n: number): string[] {
  const m = mondayOf(today);
  return Array.from({ length: n }, (_, i) => addDays(m, -7 * (n - 1 - i)));
}

const SPORT_LABEL: Record<Activity["sport"], string> = {
  run: "Correr",
  ride: "Bici",
  swim: "Natación",
  walk: "Caminar",
  strength: "Fuerza",
  other: "Otros",
};

export function computeStats(acts: Activity[], profile: Profile, today: string): Stats {
  const sorted = [...acts].sort((a, b) => a.startLocal.localeCompare(b.startLocal));
  const vdot = estimateVdot(sorted, profile, today);

  // Carga diaria
  const loads = new Map<string, number>();
  for (const a of sorted) loads.set(a.date, (loads.get(a.date) ?? 0) + activityLoad(a, profile, vdot.vdot));
  const first = sorted[0]?.date ?? today;
  const historyDays = diffDays(today, first);
  const from = historyDays > 365 * 2 ? addDays(today, -365 * 2) : addDays(first, -14);
  // con poco historial, la forma de partida sale del volumen declarado en el perfil (~6 puntos por km suave)
  const seed = historyDays < 42 ? (profile.weeklyKm * 6) / 7 : 0;
  const fitness = fitnessSeries(loads, from, today, seed);
  const todayPoint = fitness[fitness.length - 1] ?? { date: today, load: 0, ctl: 0, atl: 0, tsb: 0 };
  const ms = monotonyStrain(loads, today);

  // Semanas
  const weekKeys = lastNWeeks(today, 26);
  const weekMap = new Map<string, WeekStat>(
    weekKeys.map((w) => [
      w,
      { week: w, runKm: 0, runCount: 0, hours: 0, load: 0, elevation: 0, kcal: 0, longestKm: 0, byType: {} },
    ]),
  );
  const paceAcc = new Map<string, { dist: number; sec: number; hrSec: number; hrW: number; cad: number; cadW: number }>();
  for (const a of sorted) {
    const w = weekMap.get(mondayOf(a.date));
    if (!w) continue;
    const h = a.movingSec / 3600;
    w.hours += h;
    w.load += activityLoad(a, profile, vdot.vdot);
    w.elevation += a.elevationGainM;
    w.kcal += activityKcal(a, profile.weightKg);
    w.byType[SPORT_LABEL[a.sport]] = (w.byType[SPORT_LABEL[a.sport]] ?? 0) + h;
    if (a.sport === "run") {
      const km = a.distanceM / 1000;
      w.runKm += km;
      w.runCount++;
      w.longestKm = Math.max(w.longestKm, km);
      const acc = paceAcc.get(w.week) ?? { dist: 0, sec: 0, hrSec: 0, hrW: 0, cad: 0, cadW: 0 };
      acc.dist += a.distanceM;
      acc.sec += a.movingSec;
      if (a.avgHr) {
        acc.hrSec += a.avgHr * a.movingSec;
        acc.hrW += a.movingSec;
      }
      if (a.avgCadence) {
        acc.cad += a.avgCadence * a.movingSec;
        acc.cadW += a.movingSec;
      }
      paceAcc.set(w.week, acc);
    }
  }
  const weeks = [...weekMap.values()];
  const paceTrend = weeks.map((w) => {
    const acc = paceAcc.get(w.week);
    if (!acc || acc.dist === 0) return { week: w.week };
    const pace = acc.sec / (acc.dist / 1000);
    const hr = acc.hrW ? acc.hrSec / acc.hrW : undefined;
    w.avgPace = pace;
    w.avgHr = hr;
    return {
      week: w.week,
      pace,
      hr,
      // Efficiency Factor: velocidad (m/min) / FC
      ef: hr ? acc.dist / (acc.sec / 60) / hr : undefined,
      cadence: acc.cadW ? acc.cad / acc.cadW : undefined,
    };
  });

  // Meses (12)
  const monthKeys: string[] = [];
  {
    const [y, m] = today.split("-").map(Number);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(y, m - 1 - i, 1));
      monthKeys.push(d.toISOString().slice(0, 7));
    }
  }
  const monthMap = new Map<string, MonthStat & { sec: number }>(
    monthKeys.map((k) => [k, { month: k, runKm: 0, runs: 0, hours: 0, elevation: 0, kcal: 0, sec: 0 }]),
  );
  for (const a of sorted) {
    const m = monthMap.get(a.date.slice(0, 7));
    if (!m) continue;
    m.hours += a.movingSec / 3600;
    m.elevation += a.elevationGainM;
    m.kcal += activityKcal(a, profile.weightKg);
    if (a.sport === "run") {
      m.runKm += a.distanceM / 1000;
      m.runs++;
      m.sec += a.movingSec;
    }
  }
  const months = [...monthMap.values()].map(({ sec, ...m }) => ({ ...m, avgPace: m.runKm ? sec / m.runKm : undefined }));

  // VDOT por mes (mejor esfuerzo)
  const vdotTrend = monthKeys
    .map((month) => {
      const vs = runs(sorted)
        .filter((a) => a.date.startsWith(month) && a.distanceM >= 3000 && a.movingSec >= 720)
        .map((a) => vdotFromRace(a.distanceM / 1000, a.movingSec))
        .filter((v) => v > 15 && v < 85);
      return { month, vdot: vs.length ? Math.max(...vs) : NaN };
    })
    .filter((x) => !isNaN(x.vdot));

  // Tiempo en zonas (por FC media de cada actividad, últimas 8 semanas)
  const zones = hrZones(hrMaxOf(profile), hrRestOf(profile));
  const zoneMin = new Map<number, number>();
  for (const a of sorted) {
    if (!a.avgHr || diffDays(today, a.date) > 56) continue;
    const z = zoneOfHr(a.avgHr, zones);
    zoneMin.set(z, (zoneMin.get(z) ?? 0) + a.movingSec / 60);
  }
  const zoneTime = zones.map((z) => ({ zone: z.zone, name: z.name, minutes: zoneMin.get(z.zone) ?? 0 }));

  // Día de la semana (últimas 12 semanas)
  const wdKm = Array(7).fill(0);
  for (const a of runs(sorted)) if (diffDays(today, a.date) <= 84) wdKm[weekday(a.date)] += a.distanceM / 1000;
  const weekdayKm = wdKm.map((km, day) => ({ day, km }));

  // Deportes (últimos 90 días)
  const sportAcc = new Map<string, { hours: number; count: number }>();
  for (const a of sorted) {
    if (diffDays(today, a.date) > 90) continue;
    const k = SPORT_LABEL[a.sport];
    const s = sportAcc.get(k) ?? { hours: 0, count: 0 };
    s.hours += a.movingSec / 3600;
    s.count++;
    sportAcc.set(k, s);
  }
  const sportSplit = [...sportAcc.entries()].map(([sport, v]) => ({ sport, ...v })).sort((a, b) => b.hours - a.hours);

  // Totales y rachas
  const allRuns = runs(sorted);
  const year = today.slice(0, 4);
  const runDays = new Set(sorted.map((a) => a.date));
  let streakDays = 0;
  for (let d = runDays.has(today) ? today : addDays(today, -1); runDays.has(d); d = addDays(d, -1)) streakDays++;
  let longestStreak = 0;
  {
    const days = [...runDays].sort();
    let cur = 0;
    let prev = "";
    for (const d of days) {
      cur = prev && diffDays(d, prev) === 1 ? cur + 1 : 1;
      longestStreak = Math.max(longestStreak, cur);
      prev = d;
    }
  }
  const last12 = weeks.slice(-12);
  const last6 = weeks.slice(-7, -1); // 6 semanas completas
  const totals = {
    allKm: allRuns.reduce((s, a) => s + a.distanceM, 0) / 1000,
    allRuns: allRuns.length,
    allHours: sorted.reduce((s, a) => s + a.movingSec, 0) / 3600,
    yearKm: allRuns.filter((a) => a.date.startsWith(year)).reduce((s, a) => s + a.distanceM, 0) / 1000,
    yearRuns: allRuns.filter((a) => a.date.startsWith(year)).length,
    monthKm: allRuns.filter((a) => a.date.startsWith(today.slice(0, 7))).reduce((s, a) => s + a.distanceM, 0) / 1000,
    weekKm: weeks[weeks.length - 1]?.runKm ?? 0,
    avgWeeklyKm6: last6.reduce((s, w) => s + w.runKm, 0) / Math.max(1, last6.length),
    elevation: sorted.reduce((s, a) => s + a.elevationGainM, 0),
    kcal: sorted.reduce((s, a) => s + activityKcal(a, profile.weightKg), 0),
    streakDays,
    longestStreak,
    consistency: (last12.filter((w) => w.runCount > 0).length / Math.max(1, last12.length)) * 100,
  };

  // Récords: mejor ritmo en actividades de al menos X km (aprox. a partir de resúmenes)
  const records: Record_[] = [];
  const bestOver = (minKm: number, label: string) => {
    const c = allRuns.filter((a) => a.distanceM >= minKm * 1000);
    if (!c.length) return;
    const best = c.reduce((b, a) => (a.movingSec / a.distanceM < b.movingSec / b.distanceM ? a : b));
    const est = (best.movingSec / best.distanceM) * minKm * 1000;
    records.push({
      label,
      value: fmtDuration(est),
      sub: `${best.name} · ${(best.distanceM / 1000).toFixed(1)} km`,
      activityId: best.id,
      date: best.date,
    });
  };
  bestOver(5, "Mejor 5K (ritmo medio)");
  bestOver(10, "Mejor 10K (ritmo medio)");
  bestOver(21.0975, "Mejor media (ritmo medio)");
  bestOver(42.195, "Mejor maratón");
  if (allRuns.length) {
    const longest = allRuns.reduce((b, a) => (a.distanceM > b.distanceM ? a : b));
    records.push({ label: "Carrera más larga", value: `${(longest.distanceM / 1000).toFixed(1)} km`, sub: longest.name, activityId: longest.id, date: longest.date });
    const climb = allRuns.reduce((b, a) => (a.elevationGainM > b.elevationGainM ? a : b));
    records.push({ label: "Más desnivel", value: `${Math.round(climb.elevationGainM)} m`, sub: climb.name, activityId: climb.id, date: climb.date });
  }
  const bestWeek = weeks.reduce((b, w) => (w.runKm > b.runKm ? w : b), weeks[0]);
  if (bestWeek?.runKm) records.push({ label: "Semana con más km (26 sem)", value: `${bestWeek.runKm.toFixed(1)} km`, date: bestWeek.week });
  records.push({ label: "Racha más larga", value: `${longestStreak} días` });

  const predictions = [
    { label: "5K", km: 5 },
    { label: "10K", km: 10 },
    { label: "Media maratón", km: 21.0975 },
    { label: "Maratón", km: 42.195 },
  ].map((p) => ({ ...p, ...enduranceAdjustedTime(vdot.vdot, p.km, totals.avgWeeklyKm6) }));

  return {
    vdot,
    loads,
    fitness,
    today: todayPoint,
    // el ratio agudo/crónico no tiene sentido sin ~3 semanas de datos
    acwr: historyDays >= 21 ? acwr(loads, today) : 0,
    monotony: ms.monotony,
    strain: ms.strain,
    weeks,
    months,
    zoneTime,
    weekdayKm,
    sportSplit,
    paceTrend,
    vdotTrend,
    totals,
    records,
    predictions,
  };
}

