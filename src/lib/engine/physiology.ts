// Fórmulas fisiológicas: VDOT (Daniels-Gilbert), ritmos de entrenamiento, predicciones, zonas FC.
import type { PaceRange, Profile } from "../types";

// ---------- VDOT (Daniels & Gilbert, 1979) ----------

/** Consumo de O2 (ml/kg/min) a una velocidad v (m/min). */
export function vo2AtVelocity(v: number): number {
  return -4.6 + 0.182258 * v + 0.000104 * v * v;
}

/** Fracción de VO2max sostenible durante t minutos. */
export function fractionVo2max(tMin: number): number {
  return 0.8 + 0.1894393 * Math.exp(-0.012778 * tMin) + 0.2989558 * Math.exp(-0.1932605 * tMin);
}

export function vdotFromRace(distanceKm: number, timeSec: number): number {
  const tMin = timeSec / 60;
  const v = (distanceKm * 1000) / tMin;
  return vo2AtVelocity(v) / fractionVo2max(tMin);
}

/** Velocidad (m/min) a la que el VO2 es `vo2`. Inversa de vo2AtVelocity. */
export function velocityAtVo2(vo2: number): number {
  const a = 0.000104;
  const b = 0.182258;
  const c = -4.6 - vo2;
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

/** Tiempo de carrera previsto (seg) para una distancia a partir de un VDOT (bisección). */
export function raceTimeFromVdot(vdot: number, distanceKm: number): number {
  let lo = 60; // seg
  let hi = 60 * 60 * 12;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    // VDOT de una marca decrece al aumentar el tiempo
    if (vdotFromRace(distanceKm, mid) > vdot) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const paceAt = (vdot: number, fraction: number) => 60000 / velocityAtVo2(vdot * fraction); // seg/km

export interface TrainingPaces {
  easy: PaceRange; // E: 63-74 % VO2max
  marathon: PaceRange; // M
  threshold: PaceRange; // T: ~88 %
  interval: PaceRange; // I: ~97,5 %
  repetition: PaceRange; // R: I − ~6 s/400 m
  halfMarathon: PaceRange;
  tenK: PaceRange;
  fiveK: PaceRange;
}

function racePace(vdot: number, km: number): PaceRange {
  const p = raceTimeFromVdot(vdot, km) / km;
  return { fast: p, slow: p };
}

export function trainingPaces(vdot: number): TrainingPaces {
  const t = paceAt(vdot, 0.88);
  const i = paceAt(vdot, 0.975);
  return {
    easy: { fast: paceAt(vdot, 0.74), slow: paceAt(vdot, 0.63) },
    marathon: racePace(vdot, 42.195),
    threshold: { fast: t - 2, slow: t + 3 },
    interval: { fast: i - 2, slow: i + 2 },
    repetition: { fast: i - 17, slow: i - 13 },
    halfMarathon: racePace(vdot, 21.0975),
    tenK: racePace(vdot, 10),
    fiveK: racePace(vdot, 5),
  };
}

/** Ritmo objetivo de competición para cualquier distancia. */
export function goalPace(distanceKm: number, timeSec: number): number {
  return timeSec / distanceKm;
}

/** Fórmula de Riegel: T2 = T1 · (D2/D1)^1,06 */
export function riegel(d1Km: number, t1Sec: number, d2Km: number, exponent = 1.06): number {
  return t1Sec * Math.pow(d2Km / d1Km, exponent);
}

/**
 * Predicción ajustada al volumen ("forma de maratón", inspirado en Runalyze):
 * sin kilómetros suficientes la media y el maratón empeoran respecto al VDOT puro.
 */
export function enduranceAdjustedTime(vdot: number, distanceKm: number, avgWeeklyKm: number): {
  timeSec: number;
  pureSec: number;
  shape: number;
} {
  const pureSec = raceTimeFromVdot(vdot, distanceKm);
  if (distanceKm < 15) return { timeSec: pureSec, pureSec, shape: 1 };
  // km/semana recomendados para rendir al 100 % del VDOT en la distancia
  const needed = distanceKm > 30 ? 25 + vdot * 0.9 : 15 + vdot * 0.5;
  const shape = Math.min(1, avgWeeklyKm / needed);
  const maxPenalty = distanceKm > 30 ? 0.12 : 0.05;
  return { timeSec: pureSec * (1 + maxPenalty * (1 - shape)), pureSec, shape };
}

/** VDOT aproximado por nivel cuando no hay marcas ni actividades. */
export function defaultVdot(level: Profile["level"]): number {
  return { nuevo: 28, principiante: 33, intermedio: 42, avanzado: 50 }[level];
}

export function vo2maxLabel(vdot: number, sex: Profile["sex"], age: number): string {
  // Bandas orientativas por sexo; corrección ligera por edad
  const adj = vdot + Math.max(0, age - 30) * 0.25;
  const cut = sex === "male" ? [35, 42, 49, 56] : [30, 37, 44, 51];
  if (adj < cut[0]) return "Bajo";
  if (adj < cut[1]) return "Aceptable";
  if (adj < cut[2]) return "Bueno";
  if (adj < cut[3]) return "Excelente";
  return "Superior";
}

// ---------- Frecuencia cardiaca ----------

export function hrMaxOf(p: Pick<Profile, "hrMax" | "age">): number {
  return p.hrMax ?? Math.round(208 - 0.7 * p.age); // Tanaka
}

export function hrRestOf(p: Pick<Profile, "hrRest">): number {
  return p.hrRest ?? 60;
}

export interface HrZone {
  zone: number;
  name: string;
  min: number;
  max: number;
  purpose: string;
}

/** 5 zonas por Karvonen (% de FC de reserva). */
export function hrZones(hrMax: number, hrRest: number): HrZone[] {
  const r = hrMax - hrRest;
  const at = (f: number) => Math.round(hrRest + r * f);
  return [
    { zone: 1, name: "Recuperación", min: at(0.5), max: at(0.6), purpose: "Recuperar, calentar" },
    { zone: 2, name: "Aeróbico", min: at(0.6), max: at(0.7), purpose: "Base aeróbica, rodajes E y tirada larga" },
    { zone: 3, name: "Tempo", min: at(0.7), max: at(0.8), purpose: "Ritmo maratón, resistencia" },
    { zone: 4, name: "Umbral", min: at(0.8), max: at(0.9), purpose: "Umbral láctico, ritmo T" },
    { zone: 5, name: "VO2max", min: at(0.9), max: hrMax, purpose: "Series I y R" },
  ];
}

export function zoneOfHr(hr: number, zones: HrZone[]): number {
  for (let i = zones.length - 1; i >= 0; i--) if (hr >= zones[i].min) return zones[i].zone;
  return 1;
}

// ---------- Cuerpo ----------

export function bmi(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return weightKg / (h * h);
}

export function bmiLabel(b: number): string {
  if (b < 18.5) return "Bajo peso";
  if (b < 25) return "Normal";
  if (b < 30) return "Sobrepeso";
  return "Obesidad";
}

/** kcal aproximadas al correr: ~1 kcal/kg/km (más desnivel). */
export function runKcal(weightKg: number, distanceKm: number, elevationGainM = 0): number {
  return weightKg * (distanceKm + elevationGainM * 0.008);
}

/** kcal por MET para otros deportes. */
export function metKcal(met: number, weightKg: number, hours: number): number {
  return met * weightKg * hours;
}

// ---------- Carrera: ajustes por desnivel y calor ----------

/** Distancia llana equivalente: cada m de subida ≈ 8 m llanos; bajar devuelve aprox. la mitad. */
export function flatEquivalentKm(distanceKm: number, gainM: number, lossM = gainM): number {
  return distanceKm + (gainM * 8 - lossM * 4) / 1000;
}

/** Penalización por calor: ~0,3 % por °C por encima de 12 °C en distancias largas. */
export function heatFactor(tempC: number | undefined, distanceKm: number): number {
  if (tempC === undefined || tempC <= 12) return 1;
  const perDeg = distanceKm > 30 ? 0.004 : distanceKm > 15 ? 0.003 : 0.002;
  return 1 + (tempC - 12) * perDeg;
}
