// Serie de una carrera (segundo a segundo, reducida): ritmo y desnivel por km, ritmo ajustado a la pendiente,
// tiempo en cada zona y mejores esfuerzos. Sale de Strava (streams), de «Grabar con GPS» o de un archivo.
import type { TrainingPaces } from "./physiology";

export interface Stream {
  t: number[]; // segundos desde el inicio
  d: number[]; // metros acumulados
  alt?: number[]; // m
  hr?: number[]; // ppm
}

const MAX_POINTS = 1500;
const MIN_STEP_M = 10;
// parado: más de esto entre dos puntos sin avanzar apenas no cuenta como tiempo en movimiento
const MAX_GAP_SEC = 30;
const MIN_SPEED = 0.6; // m/s (≈ 28 min/km): más lento es estar parado

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Reduce la serie (un punto cada ≥ 10 m y como mucho 1.500) para guardarla sin ocupar mucho. */
export function compactStream(s: Stream): Stream | undefined {
  const n = Math.min(s.t.length, s.d.length);
  if (n < 2) return undefined;
  const total = s.d[n - 1] - s.d[0];
  const step = Math.max(MIN_STEP_M, total / MAX_POINTS);
  const keep: number[] = [0];
  for (let i = 1; i < n - 1; i++) if (s.d[i] - s.d[keep[keep.length - 1]] >= step) keep.push(i);
  keep.push(n - 1);
  const t0 = s.t[0];
  const d0 = s.d[0];
  const out: Stream = { t: keep.map((i) => Math.round(s.t[i] - t0)), d: keep.map((i) => Math.round(s.d[i] - d0)) };
  if (s.alt?.length === s.t.length && s.alt.some((x) => Number.isFinite(x))) out.alt = keep.map((i) => round1(s.alt![i] ?? 0));
  if (s.hr?.length === s.t.length && s.hr.some((x) => x > 0)) out.hr = keep.map((i) => Math.round(s.hr![i] ?? 0));
  return out;
}

/** Serie a partir de puntos de GPS (tiempo en ms, lat, lon, altitud; `b` = primer punto tras una pausa). */
export function streamFromPoints(points: { t: number; lat: number; lon: number; alt?: number; b?: number }[]): Stream | undefined {
  if (points.length < 2) return undefined;
  const R = 6371000;
  const rad = Math.PI / 180;
  const t: number[] = [];
  const d: number[] = [];
  const alt: number[] = [];
  let dist = 0;
  points.forEach((p, i) => {
    // tras una pausa no se suma el salto (se pudo mover con la grabación parada)
    if (i && !p.b) {
      const q = points[i - 1];
      const dLat = (p.lat - q.lat) * rad;
      const dLng = (p.lon - q.lon) * rad;
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(q.lat * rad) * Math.cos(p.lat * rad) * Math.sin(dLng / 2) ** 2;
      dist += 2 * R * Math.asin(Math.sqrt(h));
    }
    t.push((p.t - points[0].t) / 1000);
    d.push(dist);
    alt.push(p.alt ?? NaN);
  });
  return compactStream({ t, d, alt: alt.some(Number.isFinite) ? alt : undefined });
}

/** Tramos en movimiento: [desde, hasta] por índice, con su tiempo y distancia. */
function segments(s: Stream) {
  const out: { i: number; dt: number; dd: number }[] = [];
  for (let i = 1; i < s.t.length; i++) {
    const dt = s.t[i] - s.t[i - 1];
    const dd = s.d[i] - s.d[i - 1];
    if (dt <= 0 || dd < 0) continue;
    if (dt > MAX_GAP_SEC && dd / dt < MIN_SPEED) continue; // pausa
    if (dd / dt < MIN_SPEED) continue;
    out.push({ i, dt, dd });
  }
  return out;
}

/** Altitud suavizada (media de ±50 m): la del GPS baila y hace pendientes falsas. */
function smoothAlt(s: Stream): number[] | undefined {
  if (!s.alt) return undefined;
  const a = s.alt;
  const out: number[] = [];
  let lo = 0;
  let hi = 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    while (hi < a.length && s.d[hi] - s.d[i] <= 50) sum += a[hi++];
    while (s.d[i] - s.d[lo] > 50) sum -= a[lo++];
    out.push(sum / (hi - lo));
  }
  return out;
}

export interface ProfilePoint {
  km: number;
  pace?: number; // s/km (sin pausas)
  alt?: number;
}

/** Ritmo y altitud a lo largo de la carrera, en `n` tramos iguales de distancia (para el gráfico). */
export function paceProfile(s: Stream, n = 80): ProfilePoint[] {
  const total = s.d[s.d.length - 1];
  if (!total || total < 200) return [];
  const width = total / n;
  const time = new Array<number>(n).fill(0);
  const dist = new Array<number>(n).fill(0);
  for (const g of segments(s)) {
    const b = Math.min(n - 1, Math.floor(((s.d[g.i - 1] + s.d[g.i]) / 2) / width));
    time[b] += g.dt;
    dist[b] += g.dd;
  }
  const alt = smoothAlt(s);
  const out: ProfilePoint[] = [];
  let j = 0;
  for (let b = 0; b < n; b++) {
    const mid = (b + 0.5) * width;
    while (j < s.d.length - 1 && s.d[j] < mid) j++;
    const pace = dist[b] > width * 0.3 ? (time[b] / dist[b]) * 1000 : undefined;
    out.push({ km: round1(mid / 100) / 10, pace: pace && Math.min(Math.max(pace, 150), 1200), alt: alt && round1(alt[j]) });
  }
  // un poco de suavizado: el GPS da saltos de un tramo a otro
  return out.map((p, i) => {
    const near = out.slice(Math.max(0, i - 1), i + 2).map((x) => x.pace).filter((x): x is number => x !== undefined);
    return p.pace === undefined ? p : { ...p, pace: Math.round(near.reduce((x, y) => x + y, 0) / near.length) };
  });
}

/** Coste de correr con pendiente frente a llano (Minetti 2002), con la pendiente acotada a ±30 %. */
export function gradeCost(g: number): number {
  const x = Math.min(0.3, Math.max(-0.3, g));
  return (155.4 * x ** 5 - 30.4 * x ** 4 - 43.3 * x ** 3 + 46.3 * x ** 2 + 19.5 * x + 3.6) / 3.6;
}

/** Ritmo ajustado a la pendiente (s/km): el ritmo que equivaldría en llano. Sin altitud, undefined. */
export function gradeAdjustedPace(s: Stream): number | undefined {
  const alt = smoothAlt(s);
  if (!alt) return undefined;
  let time = 0;
  let flat = 0;
  for (const g of segments(s)) {
    const grade = g.dd > 0 ? (alt[g.i] - alt[g.i - 1]) / g.dd : 0;
    time += g.dt;
    flat += g.dd * gradeCost(grade);
  }
  return flat > 0 ? (time / flat) * 1000 : undefined;
}

/** Desnivel positivo de la serie (con la altitud suavizada). */
export function elevationGain(s: Stream): number | undefined {
  const alt = smoothAlt(s);
  if (!alt) return undefined;
  let gain = 0;
  for (let i = 1; i < alt.length; i++) if (alt[i] > alt[i - 1]) gain += alt[i] - alt[i - 1];
  return Math.round(gain);
}

/** Límites de las zonas de ritmo (s/km, de más lento a más rápido) con los ritmos del VDOT. */
export function zoneLimits(p: TrainingPaces): number[] {
  // Z1 más lento que el suave · Z2 suave · Z3 entre suave y umbral · Z4 umbral · Z5 hasta series · Z6 más rápido
  return [p.easy.slow, p.easy.fast, p.threshold.slow, p.threshold.fast, p.interval.fast];
}

/** Segundos en cada zona de ritmo (Z1-Z6). */
export function zoneTimes(s: Stream, limits: number[]): number[] {
  const out = [0, 0, 0, 0, 0, 0];
  for (const g of segments(s)) {
    const pace = (g.dt / g.dd) * 1000;
    let z = 0;
    while (z < limits.length && pace < limits[z]) z++;
    out[z] += g.dt;
  }
  return out;
}

export const EFFORT_DISTANCES = [400, 1000, 1609, 3000, 5000, 10000, 21097, 42195] as const;
export type EffortDistance = (typeof EFFORT_DISTANCES)[number];

/** Mejor tiempo (s) de cada distancia dentro de la carrera (ventana deslizante sobre la serie). */
export function bestEfforts(s: Stream): Partial<Record<EffortDistance, number>> {
  const out: Partial<Record<EffortDistance, number>> = {};
  const total = s.d[s.d.length - 1];
  for (const dist of EFFORT_DISTANCES) {
    if (dist > total) break;
    let best = Infinity;
    let i = 0;
    for (let j = 1; j < s.d.length; j++) {
      while (i < j && s.d[j] - s.d[i + 1] >= dist) i++;
      const covered = s.d[j] - s.d[i];
      if (covered < dist) continue;
      // se recorta el sobrante al principio, suponiendo ritmo constante en ese tramo
      const seg = s.d[i + 1] - s.d[i];
      const extra = covered - dist;
      const start = seg > 0 ? s.t[i] + (s.t[i + 1] - s.t[i]) * Math.min(1, extra / seg) : s.t[i];
      best = Math.min(best, s.t[j] - start);
    }
    if (Number.isFinite(best) && best > dist / 12) out[dist] = Math.round(best); // más rápido que 12 m/s es un error del GPS
  }
  return out;
}
