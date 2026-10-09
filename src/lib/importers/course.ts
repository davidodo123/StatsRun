// Recorridos de carreras (sin horas): KMZ/KML de webs como cruzandolameta.es o Google Earth, y GPX de ruta.
// Se saca el trazado, la distancia, el desnivel y los puntos marcados (salida, meta, avituallamientos).
import { unzipSync, strFromU8 } from "fflate";
import { routeFromPoints } from "../route";
import type { CourseMarker, RaceCourse } from "../types";

interface Pt {
  lat: number;
  lon: number;
  ele?: number;
}

const R = 6371000;
const rad = Math.PI / 180;
function haversine(a: Pt, b: Pt): number {
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const decode = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

/** "lon,lat[,alt] lon,lat[,alt] …" de KML. */
function kmlCoords(text: string): Pt[] {
  return text
    .trim()
    .split(/\s+/)
    .map((t) => t.split(",").map(Number))
    .filter(([lon, lat]) => Number.isFinite(lat) && Number.isFinite(lon))
    .map(([lon, lat, ele]) => ({ lat, lon, ele: Number.isFinite(ele) && ele !== 0 ? ele : undefined }));
}

/** Tipo de marcador por su nombre o estilo (los KMZ de cruzandolameta usan iconos start-race, finish y glasswater). */
function markerKind(text: string): CourseMarker["kind"] | undefined {
  const s = text.toLowerCase();
  if (/water|agua|avitu|glass|drink|bebida|liquido|líquido/.test(s)) return "agua";
  if (/finish|meta|llegada|arrival/.test(s)) return "meta";
  if (/start|salida|inicio|begin/.test(s)) return "salida";
  if (/\bkm\b|kil[oó]metro|\d+\s*k\b/.test(s)) return "km";
  return undefined;
}

export function parseKml(xml: string): { points: Pt[]; markers: CourseMarker[]; name?: string } {
  const lines: Pt[][] = [];
  // trazados: LineString (lo normal) o gx:Track (coordenadas sueltas)
  for (const m of xml.matchAll(/<LineString\b[^>]*>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/gi)) lines.push(kmlCoords(m[1]));
  for (const m of xml.matchAll(/<gx:Track\b[^>]*>([\s\S]*?)<\/gx:Track>/gi)) {
    const pts = [...m[1].matchAll(/<gx:coord>([^<]+)<\/gx:coord>/gi)].map((c) => c[1].trim().split(/\s+/).map(Number));
    lines.push(pts.filter(([lon, lat]) => Number.isFinite(lat) && Number.isFinite(lon)).map(([lon, lat, ele]) => ({ lat, lon, ele: ele || undefined })));
  }
  // la línea más larga es el recorrido; las demás suelen ser variantes o adornos
  const points = lines.sort((a, b) => b.length - a.length)[0] ?? [];

  const markers: CourseMarker[] = [];
  for (const m of xml.matchAll(/<Placemark\b[^>]*>([\s\S]*?)<\/Placemark>/gi)) {
    const body = m[1];
    if (!/<Point\b/i.test(body)) continue;
    const name = decode(body.match(/<name>([\s\S]*?)<\/name>/i)?.[1] ?? "");
    const style = body.match(/<styleUrl>([^<]*)<\/styleUrl>/i)?.[1] ?? "";
    const kind = markerKind(`${name} ${style}`);
    if (!kind) continue; // puntos de traza con hora (exportaciones de Garmin): no son marcadores
    const [p] = kmlCoords(body.match(/<coordinates>([\s\S]*?)<\/coordinates>/i)?.[1] ?? "");
    if (p) markers.push({ kind, lat: p.lat, lon: p.lon, name: name || undefined });
  }
  const name = decode(xml.match(/<Document>\s*<name>([\s\S]*?)<\/name>/i)?.[1] ?? "") || undefined;
  return { points, markers, name };
}

/** KMZ = zip con un .kml (normalmente doc.kml) y los iconos. */
export function parseKmz(buf: Uint8Array): ReturnType<typeof parseKml> {
  const files = unzipSync(buf, { filter: (f) => /\.kml$/i.test(f.name) });
  const key = Object.keys(files).sort((a, b) => Number(b.endsWith("doc.kml")) - Number(a.endsWith("doc.kml")))[0];
  if (!key) throw new Error("El .kmz no contiene ningún archivo .kml.");
  return parseKml(strFromU8(files[key]));
}

/** GPX de ruta o de traza (las horas, si las hay, se ignoran: es el recorrido). */
export function parseGpxCourse(xml: string): ReturnType<typeof parseKml> {
  const read = (tag: string) =>
    [...xml.matchAll(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>|<${tag}\\b([^>]*)\\/>`, "gi"))].map((m) => {
      const attrs = m[1] ?? m[3] ?? "";
      const body = m[2] ?? "";
      return {
        lat: Number(attrs.match(/lat="([-\d.]+)"/)?.[1]),
        lon: Number(attrs.match(/lon="([-\d.]+)"/)?.[1]),
        ele: Number(body.match(/<ele>([-\d.]+)<\/ele>/)?.[1]) || undefined,
        name: decode(body.match(/<name>([\s\S]*?)<\/name>/)?.[1] ?? ""),
      };
    });
  const trk = read("trkpt");
  const points = (trk.length ? trk : read("rtept")).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  const markers: CourseMarker[] = [];
  for (const w of read("wpt")) {
    const kind = markerKind(w.name);
    if (kind && Number.isFinite(w.lat)) markers.push({ kind, lat: w.lat, lon: w.lon, name: w.name || undefined });
  }
  const name = decode(xml.match(/<(?:trk|rte|metadata)>\s*<name>([\s\S]*?)<\/name>/i)?.[1] ?? "") || undefined;
  return { points, markers, name };
}

/** Distancia y desnivel (con umbral de 3 m para no sumar ruido de altitud). */
export function courseFromPoints(points: Pt[], markers: CourseMarker[], fileName: string, name?: string): RaceCourse {
  if (points.length < 2) throw new Error("El archivo no tiene un recorrido (línea) que leer.");
  let dist = 0;
  for (let i = 1; i < points.length; i++) dist += haversine(points[i - 1], points[i]);
  let gain = 0;
  let loss = 0;
  let ref: number | undefined;
  for (const p of points) {
    if (p.ele === undefined) continue;
    if (ref === undefined) ref = p.ele;
    else if (p.ele - ref >= 3) {
      gain += p.ele - ref;
      ref = p.ele;
    } else if (ref - p.ele >= 3) {
      loss += ref - p.ele;
      ref = p.ele;
    }
  }
  const hasEle = points.some((p) => p.ele !== undefined);
  return {
    route: routeFromPoints(points)!,
    distanceKm: Math.round(dist / 10) / 100,
    elevationGainM: hasEle ? Math.round(gain) : undefined,
    elevationLossM: hasEle ? Math.round(loss) : undefined,
    markers: markers.slice(0, 50),
    fileName,
    name,
  };
}

/** Lee un archivo de recorrido según su extensión. */
export function parseCourseFile(fileName: string, buf: Uint8Array): RaceCourse {
  const lower = fileName.toLowerCase();
  const parsed = lower.endsWith(".kmz")
    ? parseKmz(buf)
    : lower.endsWith(".kml")
      ? parseKml(strFromU8(buf))
      : lower.endsWith(".gpx")
        ? parseGpxCourse(strFromU8(buf))
        : undefined;
  if (!parsed) throw new Error("Formato no admitido: sube un .kmz, .kml o .gpx.");
  return courseFromPoints(parsed.points, parsed.markers, fileName, parsed.name);
}
