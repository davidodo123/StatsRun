// Carrera grabada con el GPS del móvil: filtrado de puntos y cálculo de distancia, tiempo en movimiento,
// desnivel y parciales por km. Se usa en directo (navegador) y al guardar (servidor), con los mismos puntos.

export interface GpsPoint {
  t: number; // epoch ms
  lat: number;
  lon: number;
  alt?: number; // m
  acc?: number; // precisión horizontal, m
  b?: 1; // primer punto tras una pausa: el tramo anterior no cuenta
}

/** Peor precisión que se acepta: con más, el punto se descarta. */
const MAX_ACCURACY_M = 35;
// por debajo de esto se considera parado (pausa automática)
const MIN_SPEED = 0.6; // m/s
// más rápido que esto (≈ 1:50 /km) es un salto del GPS
const MAX_SPEED = 9;
// sin puntos durante más de esto, el tramo cuenta en distancia pero no como tiempo en movimiento
const MAX_GAP_SEC = 30;
// el desnivel solo cuenta subidas (o bajadas) de más de esto: la altura del GPS baila
const ALT_STEP = 4;

const R = 6371008.8;
export function haversine(a: Pick<GpsPoint, "lat" | "lon">, b: Pick<GpsPoint, "lat" | "lon">): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** ¿Se guarda este punto? Descarta los imprecisos, los que no se han movido y los saltos imposibles. */
export function acceptPoint(last: GpsPoint | undefined, p: GpsPoint): boolean {
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) return false;
  if (p.acc !== undefined && p.acc > MAX_ACCURACY_M) return false;
  if (!last || p.b) return true;
  const dt = (p.t - last.t) / 1000;
  if (dt <= 0) return false;
  const d = haversine(last, p);
  if (d / dt > MAX_SPEED) return false;
  // quieto: un punto cada 10 s basta (así se nota la pausa automática)
  return d >= Math.max(3, Math.min(10, p.acc ?? 5)) || dt >= 10;
}

export interface TrackStats {
  distanceM: number;
  movingSec: number;
  elevationGainM: number;
  splits: number[]; // segundos en movimiento de cada km completo
  paceNow?: number; // s/km de los últimos ~30 s en movimiento
}

export function trackStats(points: GpsPoint[]): TrackStats {
  let distanceM = 0;
  let movingSec = 0;
  let gain = 0;
  let base: number | undefined;
  const splits: number[] = [];
  let splitStart = 0;
  const recent: { d: number; s: number; t: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.alt !== undefined && Number.isFinite(p.alt)) {
      if (base === undefined || p.b) base = p.alt;
      else if (p.alt - base >= ALT_STEP) {
        gain += p.alt - base;
        base = p.alt;
      } else if (base - p.alt >= ALT_STEP) base = p.alt; // baja de verdad: desde ahí se vuelve a contar
    }
    if (i === 0 || p.b) continue;
    const prev = points[i - 1];
    const dt = (p.t - prev.t) / 1000;
    const d = haversine(prev, p);
    if (dt <= 0) continue;
    distanceM += d;
    const moving = dt <= MAX_GAP_SEC && d / dt >= MIN_SPEED;
    const sec = moving ? dt : 0;
    // parcial: el km se cierra en el punto donde se cruza, repartiendo el tiempo del tramo
    while (distanceM >= (splits.length + 1) * 1000) {
      const over = distanceM - (splits.length + 1) * 1000;
      const at = movingSec + sec * (1 - over / d);
      splits.push(Math.round(at - splitStart));
      splitStart = at;
    }
    movingSec += sec;
    if (moving) recent.push({ d, s: sec, t: p.t });
  }
  const last = points.at(-1)?.t ?? 0;
  const window = recent.filter((r) => last - r.t <= 30_000);
  const wd = window.reduce((s, r) => s + r.d, 0);
  const ws = window.reduce((s, r) => s + r.s, 0);
  return { distanceM, movingSec: Math.round(movingSec), elevationGainM: Math.round(gain), splits, paceNow: wd >= 30 ? ws / (wd / 1000) : undefined };
}
