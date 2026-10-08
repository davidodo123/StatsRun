// Carga de entrenamiento: TSS por actividad, CTL/ATL/TSB, ACWR, monotonía y strain.
import type { Activity, Profile } from "../types";
import { addDays, diffDays } from "../dates";
import { hrMaxOf, hrRestOf, trainingPaces } from "./physiology";

/** TRIMP de Banister (min · ΔFC · factor exponencial). */
export function trimp(minutes: number, avgHr: number, hrMax: number, hrRest: number, sex: Profile["sex"]): number {
  const hrr = Math.min(1, Math.max(0, (avgHr - hrRest) / (hrMax - hrRest)));
  const k = sex === "male" ? 0.64 * Math.exp(1.92 * hrr) : 0.86 * Math.exp(1.67 * hrr);
  return minutes * hrr * k;
}

/**
 * Estrés de una actividad en "puntos TSS" (100 = 1 h a umbral).
 * - Con FC: hrTSS (TRIMP normalizado con 1 h a FC umbral).
 * - Sin FC pero con esfuerzo percibido: sRPE de Foster.
 * - Carrera sin FC: rTSS por ritmo (factor de intensidad respecto al ritmo T, con desnivel).
 * - Resto sin FC: estimación por duración.
 */
export function activityLoad(a: Activity, profile: Profile, vdot: number): number {
  const minutes = a.movingSec / 60;
  if (minutes <= 0) return 0;
  const hrMax = hrMaxOf(profile);
  const hrRest = hrRestOf(profile);
  if (a.avgHr && a.avgHr > hrRest + 5) {
    const lthr = hrRest + 0.86 * (hrMax - hrRest);
    const ref = trimp(60, lthr, hrMax, hrRest, profile.sex);
    return (trimp(minutes, a.avgHr, hrMax, hrRest, profile.sex) / ref) * 100;
  }
  if (a.rpe) {
    // sRPE de Foster (RPE × minutos), escalado para que 1 h a RPE 7,5 ≈ 100 puntos (umbral)
    return (minutes * a.rpe) / 4.5;
  }
  if (a.sport === "run" && a.distanceM > 0) {
    const thresholdSpeed = 1000 / trainingPaces(vdot).threshold.fast; // m/s
    const eqDist = a.distanceM + a.elevationGainM * 8;
    const ifactor = Math.min(1.2, eqDist / a.movingSec / thresholdSpeed);
    return (minutes / 60) * ifactor * ifactor * 100;
  }
  const perHour: Record<Activity["sport"], number> = {
    run: 60,
    ride: 50,
    swim: 55,
    walk: 25,
    strength: 40,
    other: 40,
  };
  return (minutes / 60) * perHour[a.sport];
}

export interface LoadPoint {
  date: string;
  load: number;
  ctl: number; // forma (42 d)
  atl: number; // fatiga (7 d)
  tsb: number; // frescura = CTL − ATL (del día anterior, como TrainingPeaks)
}

/** Serie diaria CTL/ATL/TSB con medias exponenciales. */
/** `seed`: carga diaria de partida (p. ej. estimada del volumen declarado) para no empezar en 0. */
export function fitnessSeries(loads: Map<string, number>, from: string, to: string, seed = 0): LoadPoint[] {
  const out: LoadPoint[] = [];
  let ctl = seed;
  let atl = seed;
  const kc = 1 - Math.exp(-1 / 42);
  const ka = 1 - Math.exp(-1 / 7);
  const days = diffDays(to, from);
  for (let i = 0; i <= days; i++) {
    const date = addDays(from, i);
    const load = loads.get(date) ?? 0;
    const tsb = ctl - atl;
    ctl += (load - ctl) * kc;
    atl += (load - atl) * ka;
    out.push({ date, load, ctl, atl, tsb });
  }
  return out;
}

/** Ratio carga aguda (7 d) / crónica (28 d) — media simple. */
export function acwr(loads: Map<string, number>, today: string): number {
  let acute = 0;
  let chronic = 0;
  for (let i = 0; i < 28; i++) {
    const l = loads.get(addDays(today, -i)) ?? 0;
    if (i < 7) acute += l;
    chronic += l;
  }
  const chronicWeekly = chronic / 4;
  return chronicWeekly > 0 ? acute / chronicWeekly : 0;
}

/** Monotonía (Foster) = media diaria / desviación típica, y strain = carga semanal × monotonía. */
export function monotonyStrain(loads: Map<string, number>, today: string): { monotony: number; strain: number; weekly: number } {
  const days = Array.from({ length: 7 }, (_, i) => loads.get(addDays(today, -i)) ?? 0);
  const weekly = days.reduce((s, x) => s + x, 0);
  const mean = weekly / 7;
  const sd = Math.sqrt(days.reduce((s, x) => s + (x - mean) ** 2, 0) / 7);
  const monotony = sd > 0 ? mean / sd : 0;
  return { monotony, strain: weekly * monotony, weekly };
}

export function acwrStatus(r: number): { label: string; tone: "good" | "warn" | "bad" | "neutral" } {
  if (r === 0) return { label: "Faltan datos (3 semanas)", tone: "neutral" };
  if (r < 0.8) return { label: "Desentrenando", tone: "warn" };
  if (r <= 1.3) return { label: "Zona óptima", tone: "good" };
  if (r <= 1.5) return { label: "Precaución", tone: "warn" };
  return { label: "Riesgo de lesión", tone: "bad" };
}

export function tsbStatus(tsb: number): { label: string; tone: "good" | "warn" | "bad" | "neutral" } {
  if (tsb > 25) return { label: "Muy fresco (pierdes forma)", tone: "warn" };
  if (tsb > 5) return { label: "Fresco — listo para competir", tone: "good" };
  if (tsb > -10) return { label: "Neutro", tone: "neutral" };
  if (tsb > -30) return { label: "Entrenamiento productivo", tone: "good" };
  return { label: "Sobrecarga", tone: "bad" };
}
