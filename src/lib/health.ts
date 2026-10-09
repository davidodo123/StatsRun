// Pasos y calorías diarios que llegan de la app Salud del iPhone a través de un atajo (app Atajos).
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
  if (steps === undefined && activeKcal === undefined && restingKcal === undefined) return "No llegan pasos ni calorías (claves: pasos, kcalActivas, kcalReposo).";
  if ((steps ?? 0) < 0 || (steps ?? 0) > 200_000) return `Pasos fuera de rango: ${steps}.`;
  for (const k of [activeKcal, restingKcal]) if ((k ?? 0) < 0 || (k ?? 0) > 20_000) return `Calorías fuera de rango: ${k}.`;
  return {
    date,
    steps: steps === undefined ? undefined : Math.round(steps),
    activeKcal: activeKcal === undefined ? undefined : Math.round(activeKcal),
    restingKcal: restingKcal === undefined ? undefined : Math.round(restingKcal),
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
      updatedAt: d.updatedAt,
    });
  }
  return [...byDate.values()].filter((d) => diffDays(today, d.date) <= HEALTH_KEEP_DAYS).sort((a, b) => a.date.localeCompare(b.date));
}

export interface HealthSummary {
  today?: DailyHealth;
  avgSteps7?: number;
  avgActiveKcal7?: number;
  last30: { date: string; steps: number; kcal: number }[];
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
    })),
  };
}
