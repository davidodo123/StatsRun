// Recorrido GPS de una actividad, guardado como "encoded polyline" (formato de Google y Strava, precisión 1e-5).
// Ocupa poco (un rodaje de 10 km simplificado son ~1-2 kB) y Strava ya lo da así en `map.summary_polyline`.

export type LatLon = [number, number];

/** Máximo de puntos guardados: suficiente para dibujar el mapa, no para análisis. */
export const MAX_ROUTE_POINTS = 400;

export function encodePolyline(points: LatLon[]): string {
  let out = "";
  let prevLat = 0;
  let prevLon = 0;
  const enc = (v: number) => {
    let n = v < 0 ? ~(v << 1) : v << 1;
    let s = "";
    while (n >= 0x20) {
      s += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
      n >>= 5;
    }
    return s + String.fromCharCode(n + 63);
  };
  for (const [lat, lon] of points) {
    const la = Math.round(lat * 1e5);
    const lo = Math.round(lon * 1e5);
    out += enc(la - prevLat) + enc(lo - prevLon);
    prevLat = la;
    prevLon = lo;
  }
  return out;
}

export function decodePolyline(s: string): LatLon[] {
  const out: LatLon[] = [];
  let i = 0;
  let lat = 0;
  let lon = 0;
  const next = () => {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = s.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && i < s.length);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < s.length) {
    lat += next();
    if (i >= s.length) break;
    lon += next();
    out.push([lat / 1e5, lon / 1e5]);
  }
  return out;
}

/** Distancia perpendicular aproximada (en grados, corregida por latitud) de p al segmento a-b. */
function segDist(p: LatLon, a: LatLon, b: LatLon): number {
  const k = Math.cos((a[0] * Math.PI) / 180);
  const [px, py, ax, ay, bx, by] = [p[1] * k, p[0], a[1] * k, a[0], b[1] * k, b[0]];
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Douglas-Peucker con tolerancia creciente hasta quedar en `max` puntos o menos. */
export function simplify(points: LatLon[], max = MAX_ROUTE_POINTS): LatLon[] {
  if (points.length <= max) return points;
  const run = (eps: number) => {
    const keep = new Uint8Array(points.length);
    keep[0] = keep[points.length - 1] = 1;
    const stack: [number, number][] = [[0, points.length - 1]];
    while (stack.length) {
      const [s, e] = stack.pop()!;
      let idx = -1;
      let best = eps;
      for (let i = s + 1; i < e; i++) {
        const d = segDist(points[i], points[s], points[e]);
        if (d > best) {
          best = d;
          idx = i;
        }
      }
      if (idx >= 0) {
        keep[idx] = 1;
        stack.push([s, idx], [idx, e]);
      }
    }
    return points.filter((_, i) => keep[i]);
  };
  let eps = 0.00002; // ~2 m
  let out = run(eps);
  while (out.length > max) {
    eps *= 2;
    out = run(eps);
  }
  return out;
}

/** Recorrido codificado a partir de puntos GPS sueltos (descarta puntos sin posición o fuera de rango). */
export function routeFromPoints(points: { lat?: number; lon?: number }[]): string | undefined {
  const valid = points
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat!) <= 90 && Math.abs(p.lon!) <= 180 && !(p.lat === 0 && p.lon === 0))
    .map((p): LatLon => [p.lat!, p.lon!]);
  if (valid.length < 2) return undefined;
  return encodePolyline(simplify(valid));
}

// ---------------- Proyección para dibujar ----------------

const TILE = 256;

/** Web Mercator: lat/lon → píxeles del mundo a un zoom dado. */
export function project([lat, lon]: LatLon, zoom: number): [number, number] {
  const scale = TILE * 2 ** zoom;
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return [((lon + 180) / 360) * scale, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale];
}

export interface RouteView {
  width: number;
  height: number;
  zoom: number;
  /** Puntos del recorrido en coordenadas del lienzo. */
  path: [number, number][];
  /** Teselas de mapa que cubren el lienzo. */
  tiles: { x: number; y: number; z: number; left: number; top: number }[];
  /** Pasa cualquier punto a coordenadas del lienzo (p. ej. marcadores de salida o avituallamiento). */
  toCanvas: (p: LatLon) => [number, number];
}

/** Encaja el recorrido en un lienzo de width × height con margen, eligiendo el mayor zoom que quepa (máx. 16). */
export function routeView(points: LatLon[], width: number, height: number, pad = 16): RouteView | undefined {
  if (points.length < 2) return undefined;
  let zoom = 16;
  for (; zoom > 2; zoom--) {
    const px = points.map((p) => project(p, zoom));
    const w = Math.max(...px.map((p) => p[0])) - Math.min(...px.map((p) => p[0]));
    const h = Math.max(...px.map((p) => p[1])) - Math.min(...px.map((p) => p[1]));
    if (w <= width - 2 * pad && h <= height - 2 * pad) break;
  }
  const px = points.map((p) => project(p, zoom));
  const xs = px.map((p) => p[0]);
  const ys = px.map((p) => p[1]);
  // origen del lienzo en píxeles del mundo, con el recorrido centrado
  const ox = (Math.min(...xs) + Math.max(...xs)) / 2 - width / 2;
  const oy = (Math.min(...ys) + Math.max(...ys)) / 2 - height / 2;
  const n = 2 ** zoom;
  const tiles: RouteView["tiles"] = [];
  for (let tx = Math.floor(ox / TILE); tx <= Math.floor((ox + width) / TILE); tx++)
    for (let ty = Math.floor(oy / TILE); ty <= Math.floor((oy + height) / TILE); ty++)
      if (ty >= 0 && ty < n) tiles.push({ x: ((tx % n) + n) % n, y: ty, z: zoom, left: tx * TILE - ox, top: ty * TILE - oy });
  const toCanvas = (p: LatLon): [number, number] => {
    const [x, y] = project(p, zoom);
    return [x - ox, y - oy];
  };
  return { width, height, zoom, path: px.map(([x, y]) => [x - ox, y - oy]), tiles, toCanvas };
}
