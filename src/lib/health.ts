// Datos diarios de la app Salud del iPhone a través de un atajo (app Atajos): pasos y calorías, y para la
// recuperación VFC, pulso en reposo y sueño.
import { addDays, diffDays } from "./dates";
import type { DailyHealth } from "./types";

/** Días que se guardan (algo más de un año, para comparar con el mismo mes del año anterior). */
export const HEALTH_KEEP_DAYS = 400;

/** Fecha de hoy en España: el servidor (Vercel) va en UTC y el atajo puede no mandar la fecha. */
export const todayMadrid = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(now);

/**
 * Número tal como lo manda Atajos: número JSON o texto en formato español ("8.234", "512,7", "8.234 pasos").
 * Devuelve undefined si no es un número válido.
 */
export function parseHealthNumber(v: unknown, max = Infinity): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v !== "string") return undefined;
  let s = v.replace(/[^\d.,-]/g, "");
  if (!s) return undefined;
  // "8.234" o "1.234.567" con o sin decimales tras coma: los puntos son de miles… salvo que así salga un valor imposible
  // para ese dato: Atajos manda las calorías con punto decimal («269.714» son 269,7 kcal, no 269.714)
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    const thousands = Number(s.replace(/\./g, "").replace(",", "."));
    s = thousands <= max || s.includes(",") || (s.match(/\./g) ?? []).length > 1 ? String(thousands) : s;
  } else s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

const pick = (o: Record<string, unknown>, keys: string[]) => keys.map((k) => o[k]).find((v) => v !== undefined && v !== null && v !== "");

/** Convierte un día del cuerpo de la petición; acepta claves en español o en inglés. */
function parseDay(o: Record<string, unknown>, today: string, now: string): DailyHealth | string {
  const rawDate = pick(o, ["fecha", "date"]);
  const date = rawDate === undefined ? today : parseHealthDate(rawDate);
  if (!date) return `Fecha no válida: ${String(rawDate)} (usa AAAA-MM-DD).`;
  if (date > addDays(today, 1) || diffDays(today, date) > HEALTH_KEEP_DAYS) return `Fecha fuera de rango: ${date}.`;
  const steps = parseHealthNumber(pick(o, ["pasos", "steps"]), 200_000);
  const activeKcal = parseHealthNumber(pick(o, ["kcalActivas", "activeKcal", "calorias", "calories"]), 20_000);
  const restingKcal = parseHealthNumber(pick(o, ["kcalReposo", "restingKcal"]), 20_000);
  const hrvMs = parseHealthNumber(pick(o, ["vfc", "hrv", "hrvMs"]), 300);
  const restingHr = parseHealthNumber(pick(o, ["pulsoReposo", "fcReposo", "restingHr", "restingHeartRate"]), 130);
  let sleepHours = parseHealthNumber(pick(o, ["sueno", "sueño", "horasSueno", "sleep", "sleepHours"]));
  // Atajos puede mandar el sueño en horas, minutos o segundos según cómo se calcule
  if (sleepHours !== undefined && sleepHours > 24 * 60) sleepHours /= 3600;
  else if (sleepHours !== undefined && sleepHours > 24) sleepHours /= 60;
  if ([steps, activeKcal, restingKcal, hrvMs, restingHr, sleepHours].every((v) => v === undefined))
    return "No llega ningún dato (claves: pasos, kcalActivas, kcalReposo, vfc, pulsoReposo, sueno).";
  if ((steps ?? 0) < 0 || (steps ?? 0) > 200_000) return `Pasos fuera de rango: ${steps}.`;
  for (const k of [activeKcal, restingKcal]) if ((k ?? 0) < 0 || (k ?? 0) > 20_000) return `Calorías fuera de rango: ${k}.`;
  if (hrvMs !== undefined && (hrvMs < 5 || hrvMs > 300)) return `VFC fuera de rango (5-300 ms): ${hrvMs}.`;
  if (restingHr !== undefined && (restingHr < 25 || restingHr > 130)) return `Pulso en reposo fuera de rango (25-130): ${restingHr}.`;
  if (sleepHours !== undefined && (sleepHours < 0 || sleepHours > 16)) return `Horas de sueño fuera de rango (0-16): ${sleepHours}.`;
  const round = (v: number | undefined, d = 0) => (v === undefined ? undefined : Math.round(v * 10 ** d) / 10 ** d);
  return {
    date,
    steps: round(steps),
    activeKcal: round(activeKcal),
    restingKcal: round(restingKcal),
    hrvMs: round(hrvMs),
    restingHr: round(restingHr),
    // las horas de sueño a 0 son «no se registró», no «no durmió»
    sleepHours: sleepHours ? round(sleepHours, 1) : undefined,
    updatedAt: now,
  };
}

const MONTHS: Record<string, number> = { ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12 };
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Fecha tal como la manda Atajos → AAAA-MM-DD (día en España). Acepta «2026-10-11», ISO con hora y zona
 * («2026-10-10T22:00:00Z» es ya el día 11 en España), «11/10/2026», «11 oct 2026», «11 de octubre de 2026» y «Oct 11, 2026».
 */
export function parseHealthDate(v: unknown): string | undefined {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : todayMadrid(v);
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    // con zona horaria se pasa al día de España; sin ella, la fecha tal cual
    if (/(Z|[+-]\d{2}:?\d{2})$/.test(s)) {
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? undefined : todayMadrid(d);
    }
    return s.slice(0, 10);
  }
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
  const t = s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  m = t.match(/(\d{1,2})\s+(?:de\s+)?([a-z]{3})[a-z]*\.?\s+(?:de\s+)?(\d{4})/);
  if (m && MONTHS[m[2]]) return `${m[3]}-${pad(MONTHS[m[2]])}-${pad(+m[1])}`;
  m = t.match(/([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (m && MONTHS[m[1]]) return `${m[3]}-${pad(MONTHS[m[1]])}-${pad(+m[2])}`;
  return undefined;
}

const SERIES: [string, string[], string[]][] = [
  // [clave del día, listas de valores aceptadas, listas de fechas propias]
  ["pasos", ["pasos", "steps"], ["fechasPasos"]],
  ["kcalActivas", ["kcalActivas", "activeKcal"], ["fechasKcal", "fechasActivas"]],
  ["kcalReposo", ["kcalReposo", "restingKcal"], ["fechasReposo"]],
  ["vfc", ["vfc", "hrv"], ["fechasVfc"]],
  ["pulsoReposo", ["pulsoReposo", "restingHr"], ["fechasPulso"]],
  ["sueno", ["sueno", "sueño", "sleep"], ["fechasSueno"]],
];

/**
 * Formato de listas, el que sale de Atajos al buscar muestras «de los últimos 7 días» agrupadas por día:
 * {"fechas": [...], "pasos": [...], "kcalActivas": [...]} (o una lista de fechas propia por dato: fechasPasos, fechasKcal…).
 * Se juntan por fecha en un día por elemento. Devuelve undefined si el cuerpo no trae listas.
 */
function daysFromLists(o: Record<string, unknown>, today: string): Record<string, unknown>[] | string | undefined {
  // Atajos, con una variable de lista en un campo de texto, manda los elementos separados por saltos de línea
  const asList = (v: unknown) => (Array.isArray(v) ? v : typeof v === "string" ? v.split(/\r?\n/).map((x) => x.trim()).filter(Boolean) : undefined);
  const shared = asList(pick(o, ["fechas", "dates"]));
  const series = SERIES.map(([key, valueKeys, dateKeys]) => {
    const ownDates = asList(pick(o, dateKeys));
    const dates = ownDates ?? shared;
    const raw = pick(o, valueKeys);
    // con sus propias fechas, los valores son una lista (aunque sea de un día); con las comunes, solo si vienen como
    // lista o en varias líneas (un número suelto junto a las listas es el valor de hoy)
    const isList = Array.isArray(raw) || (typeof raw === "string" && (ownDates !== undefined || /\n/.test(raw)));
    return { key, values: dates && isList ? asList(raw) : undefined, dates };
  }).filter((x) => Array.isArray(x.values) && x.values.length);
  if (!series.length) return undefined;
  const byDate = new Map<string, Record<string, unknown>>();
  for (const { key, values, dates } of series) {
    if (!Array.isArray(dates)) return `Para la lista «${key}» falta la lista de fechas («fechas»).`;
    const vals = values as unknown[];
    if (dates.length !== vals.length) return `La lista «${key}» tiene ${vals.length} valores y ${dates.length} fechas.`;
    for (let i = 0; i < dates.length; i++) {
      const date = parseHealthDate(dates[i]);
      if (!date) return `No entiendo la fecha «${String(dates[i])}».`;
      const day = byDate.get(date) ?? { fecha: date };
      day[key] = vals[i];
      byDate.set(date, day);
    }
  }
  // los valores sueltos que vengan junto a las listas (p. ej. la VFC o el sueño de hoy) van al día de hoy
  for (const [key, valueKeys] of SERIES) {
    const v = pick(o, valueKeys);
    if (v === undefined || Array.isArray(v) || series.some((x) => x.key === key)) continue;
    const day = byDate.get(today) ?? { fecha: today };
    day[key] = v;
    byDate.set(today, day);
  }
  return [...byDate.values()];
}

/** Cuerpo de la petición → días válidos. Un día suelto ({pasos, kcalActivas…}), varios ({dias: [...]}) o listas paralelas ({fechas, pasos…}). */
export function parseHealthPayload(body: unknown, today: string, now = new Date().toISOString()): { days: DailyHealth[] } | { error: string } {
  if (!body || typeof body !== "object") return { error: "El cuerpo tiene que ser JSON." };
  const o = body as Record<string, unknown>;
  const fromLists = daysFromLists(o, today);
  if (typeof fromLists === "string") return { error: fromLists };
  const list = fromLists ?? (Array.isArray(o.dias) ? o.dias : Array.isArray(o.days) ? o.days : [o]);
  if (list.length > HEALTH_KEEP_DAYS) return { error: `Como mucho ${HEALTH_KEEP_DAYS} días por envío.` };
  const days: DailyHealth[] = [];
  for (const d of list) {
    if (!d || typeof d !== "object") return { error: "Cada día tiene que ser un objeto." };
    const r = parseDay(d as Record<string, unknown>, today, now);
    if (typeof r === "string") return { error: r };
    days.push(r);
  }
  return { days };
}

/**
 * Mezcla los días recibidos con los guardados. Un día nuevo sustituye los valores que trae
 * (el atajo puede ejecutarse varias veces al día con totales cada vez mayores) y conserva los que no trae.
 */
export function mergeHealth(prev: DailyHealth[], incoming: DailyHealth[], today: string): DailyHealth[] {
  const byDate = new Map(prev.map((d) => [d.date, d]));
  for (const d of incoming) {
    const old = byDate.get(d.date);
    byDate.set(d.date, {
      date: d.date,
      steps: d.steps ?? old?.steps,
      activeKcal: d.activeKcal ?? old?.activeKcal,
      restingKcal: d.restingKcal ?? old?.restingKcal,
      hrvMs: d.hrvMs ?? old?.hrvMs,
      restingHr: d.restingHr ?? old?.restingHr,
      sleepHours: d.sleepHours ?? old?.sleepHours,
      updatedAt: d.updatedAt,
    });
  }
  return [...byDate.values()].filter((d) => diffDays(today, d.date) <= HEALTH_KEEP_DAYS).sort((a, b) => a.date.localeCompare(b.date));
}

export interface HealthSummary {
  today?: DailyHealth;
  avgSteps7?: number;
  avgActiveKcal7?: number;
  last30: { date: string; steps: number; kcal: number; sleep: number | null; hrv: number | null; rhr: number | null }[];
  hasRecovery: boolean; // el atajo manda VFC, pulso en reposo o sueño
}

/** Hoy, media de los últimos 7 días completos (sin hoy) y serie de 30 días para las gráficas. */
export function healthSummary(list: DailyHealth[] | undefined, today: string): HealthSummary | undefined {
  if (!list?.length) return undefined;
  const byDate = new Map(list.map((d) => [d.date, d]));
  const prev7 = Array.from({ length: 7 }, (_, i) => byDate.get(addDays(today, -1 - i))).filter((d): d is DailyHealth => !!d);
  const mean = (xs: (number | undefined)[]) => {
    const v = xs.filter((x): x is number => x !== undefined);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : undefined;
  };
  return {
    today: byDate.get(today),
    avgSteps7: mean(prev7.map((d) => d.steps)),
    avgActiveKcal7: mean(prev7.map((d) => d.activeKcal)),
    last30: Array.from({ length: 30 }, (_, i) => addDays(today, i - 29)).map((date) => ({
      date,
      steps: byDate.get(date)?.steps ?? 0,
      kcal: byDate.get(date)?.activeKcal ?? 0,
      sleep: byDate.get(date)?.sleepHours ?? null,
      hrv: byDate.get(date)?.hrvMs ?? null,
      rhr: byDate.get(date)?.restingHr ?? null,
    })),
    hasRecovery: list.some((d) => d.hrvMs !== undefined || d.restingHr !== undefined || d.sleepHours !== undefined),
  };
}

// ---------- Recuperación: VFC, pulso en reposo y sueño ----------

export interface RecoverySignals {
  sleepAvg3?: number; // horas, media de las 3 últimas noches
  restingHrAvg3?: number;
  restingHrBase?: number; // media de 30 días (sin los 3 últimos)
  hrvAvg7?: number;
  hrvBase?: number; // media de 30 días (sin los 7 últimos)
  hrvLow?: number; // límite bajo del rango normal (media − 1 desviación típica)
  shortSleep: boolean;
  highRestingHr: boolean;
  lowHrv: boolean;
}

/** Días mínimos de línea base para dar una alerta (con menos, cualquier día raro saltaría). */
export const BASELINE_MIN_DAYS = 14;

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);

/**
 * Señales de recuperación frente a tu propia línea base (30 días):
 * - sueño corto: menos de 6,5 h de media las 3 últimas noches (Milewski 2014: < 8 h, más lesiones);
 * - pulso en reposo alto: 5 ppm o más por encima de lo normal, de media en 3 días;
 * - VFC baja: la media de 7 días por debajo de tu rango normal (media − 1 desviación típica, como en Plews 2013).
 */
export function recoverySignals(list: DailyHealth[] | undefined, today: string): RecoverySignals {
  const days = (list ?? []).filter((d) => d.date <= today && diffDays(today, d.date) < 37);
  const lastN = (n: number, k: keyof DailyHealth) => days.filter((d) => diffDays(today, d.date) < n && typeof d[k] === "number").map((d) => d[k] as number);
  const baseOf = (skip: number, k: keyof DailyHealth) =>
    days.filter((d) => diffDays(today, d.date) >= skip && diffDays(today, d.date) < skip + 30 && typeof d[k] === "number").map((d) => d[k] as number);

  const sleep3 = lastN(3, "sleepHours");
  const sleepAvg3 = sleep3.length >= 2 ? avg(sleep3) : undefined;

  const rhr3 = lastN(3, "restingHr");
  const rhrBase = baseOf(3, "restingHr");
  const restingHrAvg3 = rhr3.length >= 2 ? avg(rhr3) : undefined;
  const restingHrBase = rhrBase.length >= BASELINE_MIN_DAYS ? avg(rhrBase) : undefined;

  const hrv7 = lastN(7, "hrvMs");
  const hrvBaseList = baseOf(7, "hrvMs");
  const hrvAvg7 = hrv7.length >= 3 ? avg(hrv7) : undefined;
  const hrvBase = hrvBaseList.length >= BASELINE_MIN_DAYS ? avg(hrvBaseList) : undefined;
  const sd = hrvBase !== undefined ? Math.sqrt(avg(hrvBaseList.map((x) => (x - hrvBase) ** 2))!) : undefined;
  const hrvLow = hrvBase !== undefined && sd !== undefined ? hrvBase - sd : undefined;

  const r1 = (v?: number) => (v === undefined ? undefined : Math.round(v * 10) / 10);
  return {
    sleepAvg3: r1(sleepAvg3),
    restingHrAvg3: r1(restingHrAvg3),
    restingHrBase: r1(restingHrBase),
    hrvAvg7: r1(hrvAvg7),
    hrvBase: r1(hrvBase),
    hrvLow: r1(hrvLow),
    shortSleep: sleepAvg3 !== undefined && sleepAvg3 < 6.5,
    highRestingHr: restingHrAvg3 !== undefined && restingHrBase !== undefined && restingHrAvg3 >= restingHrBase + 5,
    lowHrv: hrvAvg7 !== undefined && hrvLow !== undefined && hrvAvg7 < hrvLow,
  };
}

// ---------- Por meses ----------

export interface MonthHealth {
  month: string; // AAAA-MM
  days: number; // días con pasos registrados
  steps: number; // total del mes
  avgSteps?: number; // media por día con datos
  days10k: number; // días de 10.000 pasos o más
  bestDay?: { date: string; steps: number };
  kcal: number;
  avgKcal?: number;
}

/** Totales y medias por mes (de más antiguo a más reciente), hasta `months` meses con datos. Los días a 0 (sin registro) no cuentan. */
export function monthlyHealth(list: DailyHealth[] | undefined, months = 12): MonthHealth[] {
  const byMonth = new Map<string, DailyHealth[]>();
  for (const d of list ?? []) if (d.steps || d.activeKcal) byMonth.set(d.date.slice(0, 7), [...(byMonth.get(d.date.slice(0, 7)) ?? []), d]);
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-months)
    .map(([month, days]) => {
      const withSteps = days.filter((d) => d.steps);
      const withKcal = days.filter((d) => d.activeKcal);
      const steps = withSteps.reduce((t, d) => t + d.steps!, 0);
      const kcal = withKcal.reduce((t, d) => t + d.activeKcal!, 0);
      const best = withSteps.reduce<DailyHealth | undefined>((b, d) => (!b || d.steps! > b.steps! ? d : b), undefined);
      return {
        month,
        days: withSteps.length,
        steps,
        avgSteps: withSteps.length ? Math.round(steps / withSteps.length) : undefined,
        days10k: withSteps.filter((d) => d.steps! >= 10_000).length,
        ...(best ? { bestDay: { date: best.date, steps: best.steps! } } : {}),
        kcal: Math.round(kcal),
        avgKcal: withKcal.length ? Math.round(kcal / withKcal.length) : undefined,
      };
    });
}

