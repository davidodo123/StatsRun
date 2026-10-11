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
export function parseHealthNumber(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v !== "string") return undefined;
  let s = v.replace(/[^\d.,-]/g, "");
  if (!s) return undefined;
  // "8.234" o "1.234.567" con o sin decimales tras coma: los puntos son de miles
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

const pick = (o: Record<string, unknown>, keys: string[]) => keys.map((k) => o[k]).find((v) => v !== undefined && v !== null && v !== "");

/** Convierte un día del cuerpo de la petición; acepta claves en español o en inglés. */
function parseDay(o: Record<string, unknown>, today: string, now: string): DailyHealth | string {
  const rawDate = pick(o, ["fecha", "date"]);
  const date = typeof rawDate === "string" ? rawDate.slice(0, 10) : today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return `Fecha no válida: ${String(rawDate)} (usa AAAA-MM-DD).`;
  if (date > addDays(today, 1) || diffDays(today, date) > HEALTH_KEEP_DAYS) return `Fecha fuera de rango: ${date}.`;
  const steps = parseHealthNumber(pick(o, ["pasos", "steps"]));
  const activeKcal = parseHealthNumber(pick(o, ["kcalActivas", "activeKcal", "calorias", "calories"]));
  const restingKcal = parseHealthNumber(pick(o, ["kcalReposo", "restingKcal"]));
  const hrvMs = parseHealthNumber(pick(o, ["vfc", "hrv", "hrvMs"]));
  const restingHr = parseHealthNumber(pick(o, ["pulsoReposo", "fcReposo", "restingHr", "restingHeartRate"]));
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

/** Cuerpo de la petición → días válidos. Un día suelto ({pasos, kcalActivas…}) o varios ({dias: [...]}). */
export function parseHealthPayload(body: unknown, today: string, now = new Date().toISOString()): { days: DailyHealth[] } | { error: string } {
  if (!body || typeof body !== "object") return { error: "El cuerpo tiene que ser JSON." };
  const o = body as Record<string, unknown>;
  const list = Array.isArray(o.dias) ? o.dias : Array.isArray(o.days) ? o.days : [o];
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

