// Importa archivos de actividad sueltos: GPX, TCX (XML) y FIT (binario de Garmin/COROS/Polar…).
import type { Activity } from "../types";
import { localParts, shortHash, sportFromName } from "./common";
import { routeFromPoints } from "../route";

interface Point {
  t?: number; // ms
  lat?: number;
  lon?: number;
  ele?: number;
  hr?: number;
  cad?: number;
  dist?: number; // distancia acumulada (TCX)
}

function haversine(a: Point, b: Point): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b.lat! - a.lat!) * rad;
  const dLon = (b.lon! - a.lon!) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat! * rad) * Math.cos(b.lat! * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const tagNum = (block: string, tag: string) => {
  const m = block.match(new RegExp(`<(?:\\w+:)?${tag}[^>]*>\\s*([-\\d.]+)\\s*</(?:\\w+:)?${tag}>`, "i"));
  return m ? Number(m[1]) : undefined;
};
const tagStr = (block: string, tag: string) => block.match(new RegExp(`<(?:\\w+:)?${tag}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${tag}>`, "i"))?.[1]?.trim();
const decode = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

/** Resumen a partir de puntos: distancia, tiempo en movimiento, desnivel (suavizado), FC y cadencia medias. */
function summarize(points: Point[]) {
  const pts = points.filter((p) => p.t !== undefined).sort((a, b) => a.t! - b.t!);
  let dist = 0;
  let moving = 0;
  let gain = 0;
  let hrSum = 0;
  let hrW = 0;
  let maxHr = 0;
  let cadSum = 0;
  let cadW = 0;
  let eleRef: number | undefined;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dt = (b.t! - a.t!) / 1000;
    if (dt <= 0) continue;
    const d = a.dist !== undefined && b.dist !== undefined ? b.dist - a.dist : a.lat !== undefined && b.lat !== undefined ? haversine(a, b) : 0;
    dist += Math.max(0, d);
    // en movimiento: > 0,5 m/s y sin pausas largas
    const isMoving = dt < 30 && d / dt > 0.5;
    if (isMoving) moving += dt;
    if (b.hr) {
      hrSum += b.hr * dt;
      hrW += dt;
      maxHr = Math.max(maxHr, b.hr);
    }
    if (b.cad && isMoving) {
      cadSum += b.cad * dt;
      cadW += dt;
    }
  }
  // desnivel con umbral de 3 m para filtrar ruido del GPS/barómetro
  for (const p of pts) {
    if (p.ele === undefined) continue;
    if (eleRef === undefined) eleRef = p.ele;
    else if (p.ele - eleRef >= 3) {
      gain += p.ele - eleRef;
      eleRef = p.ele;
    } else if (eleRef - p.ele >= 3) eleRef = p.ele;
  }
  const elapsed = pts.length > 1 ? (pts[pts.length - 1].t! - pts[0].t!) / 1000 : 0;
  // si no hay puntos con movimiento (cinta sin GPS), usa el tiempo total
  if (moving < elapsed * 0.2) moving = elapsed;
  return {
    start: pts[0]?.t,
    distanceM: dist,
    movingSec: moving,
    elapsedSec: elapsed,
    elevationGainM: gain,
    avgHr: hrW ? hrSum / hrW : undefined,
    maxHr: maxHr || undefined,
    avgCad: cadW ? cadSum / cadW : undefined,
  };
}

function build(id: string, name: string, sportRaw: string, s: ReturnType<typeof summarize>, cadencePerLeg: boolean, points: Point[]): Activity | undefined {
  if (!s.start || s.elapsedSec <= 0) return undefined;
  const sport = sportFromName(sportRaw);
  return {
    id,
    source: "manual",
    name,
    sport,
    sportRaw,
    ...localParts(new Date(s.start)),
    distanceM: Math.round(s.distanceM),
    movingSec: Math.round(s.movingSec),
    elapsedSec: Math.round(s.elapsedSec),
    elevationGainM: Math.round(s.elevationGainM),
    avgHr: s.avgHr ? Math.round(s.avgHr) : undefined,
    maxHr: s.maxHr,
    avgCadence: s.avgCad ? Math.round(sport === "run" && cadencePerLeg && s.avgCad < 120 ? s.avgCad * 2 : s.avgCad) : undefined,
    route: routeFromPoints(points),
  };
}

export function parseGpx(xml: string, fileName: string): Activity | undefined {
  const name = decode(tagStr(xml.match(/<trk>[\s\S]*?<trkseg/i)?.[0] ?? "", "name") ?? tagStr(xml, "name") ?? fileName.replace(/\.\w+$/, ""));
  const type = tagStr(xml.match(/<trk>[\s\S]*?<trkseg/i)?.[0] ?? "", "type") ?? "running";
  const points: Point[] = [];
  for (const m of xml.matchAll(/<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/gi)) {
    const attrs = m[1];
    const body = m[2];
    const time = tagStr(body, "time");
    points.push({
      lat: Number(attrs.match(/lat="([-\d.]+)"/)?.[1]),
      lon: Number(attrs.match(/lon="([-\d.]+)"/)?.[1]),
      ele: tagNum(body, "ele"),
      t: time ? Date.parse(time) : undefined,
      hr: tagNum(body, "hr"),
      cad: tagNum(body, "cad"),
    });
  }
  if (!points.length) return undefined;
  // GPX de Strava/Garmin: tipo numérico o "running"; si la cadencia < 120 es por pierna
  return build(`file-${shortHash(xml)}`, name, /^\d+$/.test(type) ? "Run" : type, summarize(points), true, points);
}

export function parseTcx(xml: string, fileName: string): Activity | undefined {
  const sport = xml.match(/<Activity\s+Sport="([^"]+)"/i)?.[1] ?? "Running";
  const points: Point[] = [];
  for (const m of xml.matchAll(/<Trackpoint>([\s\S]*?)<\/Trackpoint>/gi)) {
    const b = m[1];
    const time = tagStr(b, "Time");
    const hrBlock = b.match(/<HeartRateBpm>[\s\S]*?<\/HeartRateBpm>/i)?.[0] ?? "";
    points.push({
      t: time ? Date.parse(time) : undefined,
      lat: tagNum(b, "LatitudeDegrees"),
      lon: tagNum(b, "LongitudeDegrees"),
      ele: tagNum(b, "AltitudeMeters"),
      dist: tagNum(b, "DistanceMeters"),
      hr: tagNum(hrBlock, "Value"),
      cad: tagNum(b, "RunCadence") ?? tagNum(b, "Cadence"),
    });
  }
  if (!points.length) return undefined;
  const name = decode(tagStr(xml, "Notes") ?? fileName.replace(/\.\w+$/, ""));
  return build(`file-${shortHash(xml)}`, name, sport, summarize(points), true, points);
}

/** FIT: usa el resumen de sesión que graba el propio reloj (más preciso que recalcular). */
export async function parseFit(buf: Uint8Array, fileName: string): Promise<Activity[]> {
  const { default: FitParser } = await import("fit-file-parser");
  const parser = new FitParser({ force: true, speedUnit: "m/s", lengthUnit: "m", mode: "list" });
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const fit = await parser.parseAsync(ab);
  const hash = shortHash(Array.from(buf.subarray(0, 4096)).join(",") + buf.length);
  const out: Activity[] = [];
  // fit-file-parser da la posición en grados; por si acaso, convierte semicírculos
  const deg = (v?: number) => (v === undefined ? undefined : Math.abs(v) > 180 ? (v * 180) / 2 ** 31 : v);
  const route = routeFromPoints((fit.records ?? []).map((r) => ({ lat: deg(r.position_lat), lon: deg(r.position_long) })));
  const sessions = fit.sessions ?? [];
  sessions.forEach((s, i) => {
    const start = s.start_time ? new Date(s.start_time) : undefined;
    if (!start || isNaN(start.getTime())) return;
    const sportRaw = String(s.sport ?? "running");
    const sport = sportFromName(sportRaw);
    const timer = Number(s.total_timer_time ?? s.total_elapsed_time ?? 0);
    const cad = Number((s as Record<string, unknown>).avg_running_cadence ?? s.avg_cadence ?? 0);
    out.push({
      id: `file-${hash}-${i}`,
      source: "manual",
      name: fileName.replace(/\.fit(\.gz)?$/i, ""),
      sport,
      sportRaw,
      ...localParts(start),
      distanceM: Math.round(Number(s.total_distance ?? 0)),
      movingSec: Math.round(Number(s.total_moving_time ?? timer)),
      elapsedSec: Math.round(Number(s.total_elapsed_time ?? timer)),
      elevationGainM: Math.round(Number(s.total_ascent ?? 0)),
      avgHr: s.avg_heart_rate ? Math.round(Number(s.avg_heart_rate)) : undefined,
      maxHr: s.max_heart_rate ? Math.round(Number(s.max_heart_rate)) : undefined,
      // FIT guarda la cadencia de carrera por pierna
      avgCadence: cad ? Math.round(sport === "run" && cad < 120 ? cad * 2 : cad) : undefined,
      // con varias sesiones (multideporte) no se sabe qué tramo es de cada una
      route: sessions.length === 1 ? route : undefined,
    });
  });
  return out;
}
