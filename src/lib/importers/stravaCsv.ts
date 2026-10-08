// Importa el activities.csv de la exportación de cuenta de Strava
// (Ajustes → Mi cuenta → Descargar o eliminar tu cuenta → Solicitar tu archivo).
import type { Activity } from "../types";
import { localParts, sportFromName } from "./common";

/** Parser CSV RFC 4180 (comillas, comas y saltos de línea dentro de campos). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let q = false;
  const t = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          field += '"';
          i++;
        } else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  ene: 1, abr: 4, ago: 8, dic: 12, set: 9,
};

/**
 * Fecha de Strava en UTC: "Mar 15, 2024, 6:45:12 AM", "15 mar 2024, 6:45:12", "2024-03-15 06:45:12"…
 */
export function parseStravaDate(s: string): Date | undefined {
  const str = s.trim().toLowerCase().replace(/\./g, "").replace(/\bde\b/g, " ");
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})[ t](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (iso) return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3], +iso[4], +iso[5], +(iso[6] ?? 0)));

  const time = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|a m|p m)?/);
  const month = str.match(/[a-záéíóú]{3,}/g)?.map((m) => MONTHS[m.slice(0, 3)]).find(Boolean);
  const nums = str.replace(time?.[0] ?? "", " ").match(/\d+/g)?.map(Number) ?? [];
  const year = nums.find((n) => n > 1900);
  const day = nums.find((n) => n >= 1 && n <= 31);
  if (!month || !year || !day || !time) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? undefined : d;
  }
  let h = Number(time[1]);
  const ampm = time[4]?.replace(" ", "");
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  return new Date(Date.UTC(year, month - 1, day, h, Number(time[2]), Number(time[3] ?? 0)));
}

function toNum(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  let s = v.trim();
  if (!s) return undefined;
  // "1.234,5" o "12,5" → formato con coma decimal
  if (/,\d{1,3}$/.test(s) && !/\.\d+$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return isFinite(n) ? n : undefined;
}

export interface CsvImportResult {
  activities: Activity[];
  errors: string[];
}

export function parseStravaActivitiesCsv(text: string): CsvImportResult {
  const rows = parseCsv(text);
  if (rows.length < 2) return { activities: [], errors: ["El CSV está vacío."] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  // Strava repite columnas (Distance en km y luego en m; Elapsed Time dos veces…)
  const first = (name: string) => header.indexOf(name);
  const last = (name: string) => header.lastIndexOf(name);
  const col = {
    id: first("activity id"),
    date: first("activity date"),
    name: first("activity name"),
    type: first("activity type"),
    elapsed: last("elapsed time"),
    moving: first("moving time"),
    distFirst: first("distance"),
    distLast: last("distance"),
    elev: first("elevation gain"),
    avgHr: first("average heart rate"),
    maxHr: first("max heart rate"),
    cadence: first("average cadence"),
    calories: first("calories"),
    effort: first("relative effort"),
  };
  if (col.id < 0 || col.date < 0) return { activities: [], errors: ["No parece el activities.csv de Strava (faltan las columnas Activity ID / Activity Date)."] };

  const errors: string[] = [];
  const activities: Activity[] = [];
  for (const r of rows.slice(1)) {
    const id = r[col.id]?.trim();
    const when = parseStravaDate(r[col.date] ?? "");
    if (!id || !when) {
      errors.push(`Fila ignorada (fecha no reconocida): ${r[col.date] ?? "?"}`);
      continue;
    }
    const sportRaw = (r[col.type] ?? "").trim();
    const sport = sportFromName(sportRaw);
    // la segunda columna Distance viene en metros; si solo hay una, está en km
    const distanceM =
      col.distLast !== col.distFirst ? toNum(r[col.distLast]) ?? (toNum(r[col.distFirst]) ?? 0) * 1000 : (toNum(r[col.distFirst]) ?? 0) * 1000;
    const elapsed = toNum(r[col.elapsed]) ?? 0;
    const moving = toNum(r[col.moving]) || elapsed;
    const avgHr = col.avgHr >= 0 ? toNum(r[col.avgHr]) : undefined;
    const maxHr = col.maxHr >= 0 ? toNum(r[last("max heart rate")]) : undefined;
    const cad = col.cadence >= 0 ? toNum(r[col.cadence]) : undefined;
    activities.push({
      id: `strava-${id}`,
      source: "strava",
      name: (r[col.name] ?? "").trim() || sportRaw || "Actividad",
      sport,
      sportRaw: sportRaw.replace(/\s/g, ""),
      ...localParts(when),
      distanceM: Math.round(distanceM),
      movingSec: Math.round(moving),
      elapsedSec: Math.round(elapsed || moving),
      elevationGainM: Math.round(col.elev >= 0 ? toNum(r[col.elev]) ?? 0 : 0),
      avgHr: avgHr || undefined,
      maxHr: maxHr || undefined,
      // Strava exporta la cadencia de carrera por pierna
      avgCadence: cad ? Math.round(sport === "run" && cad < 120 ? cad * 2 : cad) : undefined,
      kilojoules: undefined,
      sufferScore: col.effort >= 0 ? toNum(r[col.effort]) : undefined,
    });
  }
  return { activities, errors };
}
