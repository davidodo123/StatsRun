// Diagnóstico del estado de forma: decide de forma determinista si toca progresar, mantener, descargar o
// recuperar. La IA lo recibe como punto de partida y no puede contradecirlo (y el código acota sus cambios).
//
// Se apoya en:
// - Síndrome general de adaptación (Selye): alarma → resistencia (adaptación) → agotamiento.
// - Modelo condición física–fatiga (Banister): CTL/ATL/TSB.
// - Ratio carga aguda/crónica (Gabbett): zona óptima 0,8–1,3.
// - Monotonía y strain (Foster).
// - Evaluación de final de bloque (Helms, Pirámide de Entrenamiento): con 2 o más señales de mala recuperación
//   (motivación, sueño, rendimiento, estrés, molestias) toca descarga; si solo hay molestias, semana ligera.
// - Picos de una sola sesión (Frandsen et al. 2025, BJSM, 5.205 corredores): correr más de un 10 % por encima
//   de la tirada más larga de los últimos 30 días se asocia a más lesiones por sobrecarga.
import type { Activity, Feel } from "../types";
import { diffDays } from "../dates";
import type { Stats } from "./stats";

export type SelyePhase = "desentrenamiento" | "alarma" | "adaptacion" | "agotamiento" | "supercompensacion";
export type Verdict = "progresar" | "mantener" | "descargar" | "recuperar";

export interface RecoveryCheck {
  motivacionBaja: boolean;
  malDescanso: boolean;
  rendimientoBaja: boolean;
  estresAlto: boolean;
  molestias: boolean;
}

export interface Readiness {
  phase: SelyePhase;
  verdict: Verdict;
  headline: string;
  reasons: string[];
  check: RecoveryCheck;
  signals: {
    acwr: number;
    tsb: number;
    monotony: number;
    hardFeels7d: number;
    easyFeels7d: number;
    easyRunRpe7d?: number;
    efChangePct?: number;
    missed14d: number;
    painMentions: string[];
    /** Tirada más larga de los últimos 30 días (km). */
    longestRun30dKm?: number;
    /** Síntomas de enfermedad (fiebre, gripe, resfriado…) en los últimos 7 días. */
    illness: boolean;
  };
  /** Límites que el código aplica a los cambios de la IA. */
  limits: {
    maxSessionKmFactor: number;
    weeklyKmChangePct: number;
    qualityAllowed: boolean;
    /** Tope absoluto por sesión: tirada más larga de 30 días + 10 % (Frandsen 2025). */
    maxSessionKm?: number;
  };
}

const PAIN = /(dolor|duele|molest|lesi[oó]n|tendin|fascitis|periostitis|pinchazo|rodilla|gemelo|aquiles|tobillo|cadera|isquio|femoral|espalda|lumbar|pie |planta|cojea|inflama)/i;
const SLEEP = /(dorm[ií]|sue[ñn]o|insomnio|desvel|descans[eéo] mal|mal descanso|noche mala)/i;
const STRESS = /(estr[eé]s|agobi|ansied|exámen|examen|trabajo duro|mucho trabajo|preocup)/i;
const LOW_MOTIVATION = /(sin ganas|desmotiv|no me apetec|pereza|aburr|quemad)/i;
const HEAVY = /(pesad|cargad|vac[ií]o|sin fuerza|reventad|agotad|me cost[oó]|no pod[ií]a|fundid)/i;
const ILLNESS = /(fiebre|gripe|resfriad|catarro|constipad|covid|enferm|malestar general|v[oó]mit|diarrea|anginas|infecci[oó]n)/i;

/** Margen máximo sobre la tirada más larga de los últimos 30 días. */
export const SPIKE_MARGIN = 1.1;

const HARD_FEELS: Feel[] = ["duro", "muy_duro"];
const EASY_FEELS: Feel[] = ["muy_facil", "facil"];

/** Texto libre del atleta (sensaciones + notas) de una actividad. */
const textOf = (a: Activity) => `${a.feelings ?? ""} ${a.notes ?? ""}`;

export interface ReadinessInput {
  stats: Pick<Stats, "acwr" | "today" | "monotony" | "paceTrend">;
  activities: Activity[];
  today: string;
  missed14d: number;
  /** Fecha de la carrera objetivo (para no confundir el afinamiento previo con desentrenamiento). */
  raceDate?: string;
}

export function assessReadiness({ stats, activities, today, missed14d, raceDate }: ReadinessInput): Readiness {
  const last7 = activities.filter((a) => a.date <= today && diffDays(today, a.date) < 7);
  const last14 = activities.filter((a) => a.date <= today && diffDays(today, a.date) < 14);

  const hardFeels7d = last7.filter((a) => a.feel && HARD_FEELS.includes(a.feel)).length;
  const easyFeels7d = last7.filter((a) => a.feel && EASY_FEELS.includes(a.feel)).length;

  // un rodaje suave debería sentirse a RPE ≤ 4; si cuesta 6+ es señal de fatiga acumulada
  const easyRuns = last7.filter((a) => a.sport === "run" && a.rpe && a.distanceM > 0 && (!a.feel || a.feel !== "muy_duro"));
  const easyRunRpe7d = easyRuns.length ? Math.min(...easyRuns.map((a) => a.rpe!)) : undefined;

  // eficiencia (velocidad / FC): caída sostenida = la misma carrera cuesta más pulsaciones
  const efs = stats.paceTrend.map((w) => w.ef).filter((x): x is number => typeof x === "number" && x > 0);
  let efChangePct: number | undefined;
  if (efs.length >= 4) {
    const recent = efs.slice(-2);
    const base = efs.slice(-6, -2);
    const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    if (base.length) efChangePct = ((avg(recent) - avg(base)) / avg(base)) * 100;
  }

  const painMentions = last14.filter((a) => PAIN.test(textOf(a))).map((a) => `${a.date}: ${textOf(a).trim().slice(0, 80)}`);
  const illness = last7.some((a) => ILLNESS.test(textOf(a)));

  const runs30 = activities.filter((a) => a.sport === "run" && a.date <= today && diffDays(today, a.date) < 30 && a.distanceM > 0);
  const longestRun30dKm = runs30.length ? Math.max(...runs30.map((a) => a.distanceM)) / 1000 : undefined;

  const check: RecoveryCheck = {
    motivacionBaja: last14.some((a) => LOW_MOTIVATION.test(textOf(a))) || missed14d >= 3,
    malDescanso: last14.some((a) => SLEEP.test(textOf(a))),
    rendimientoBaja:
      hardFeels7d >= 2 ||
      last7.some((a) => HEAVY.test(textOf(a))) ||
      (efChangePct !== undefined && efChangePct <= -5) ||
      (easyRunRpe7d !== undefined && easyRunRpe7d >= 6),
    estresAlto: last14.some((a) => STRESS.test(textOf(a))),
    molestias: painMentions.length > 0,
  };
  const yes = Object.values(check).filter(Boolean).length;

  const acwr = stats.acwr;
  const tsb = stats.today.tsb;
  const reasons: string[] = [];
  const tapering = raceDate !== undefined && diffDays(raceDate, today) >= 0 && diffDays(raceDate, today) <= 14;

  // ----- fase de Selye -----
  let phase: SelyePhase;
  if (yes >= 2 || (tsb < -30 && acwr > 1.5)) phase = "agotamiento";
  else if (acwr > 1.3 || tsb < -20) phase = "alarma";
  else if (acwr > 0 && acwr < 0.8 && !tapering) phase = "desentrenamiento";
  else if (tsb > 5) phase = "supercompensacion";
  else phase = "adaptacion";

  if (acwr > 1.5) reasons.push(`Carga aguda muy por encima de la crónica (ACWR ${acwr.toFixed(2)} > 1,5): riesgo de lesión.`);
  else if (acwr > 1.3) reasons.push(`Subida de carga reciente (ACWR ${acwr.toFixed(2)}): el cuerpo está en fase de alarma.`);
  else if (acwr > 0 && acwr < 0.8) reasons.push(`Carga reciente baja respecto a tu base (ACWR ${acwr.toFixed(2)}).`);
  if (tsb < -30) reasons.push(`Frescura muy negativa (TSB ${tsb.toFixed(0)}): fatiga acumulada alta.`);
  if (stats.monotony > 2) reasons.push(`Semana muy monótona (monotonía ${stats.monotony.toFixed(1)} > 2): alterna días duros y suaves.`);
  if (check.rendimientoBaja) reasons.push("Rendimiento a la baja: entrenos que se hacen duros, piernas cargadas o más pulsaciones al mismo ritmo.");
  if (check.malDescanso) reasons.push("Mencionas mal descanso.");
  if (check.estresAlto) reasons.push("Mencionas estrés fuera del entrenamiento: también cuenta como carga.");
  if (check.motivacionBaja) reasons.push(missed14d >= 3 ? `Varias sesiones sin hacer (${missed14d} en 14 días).` : "Mencionas falta de ganas.");
  if (check.molestias) reasons.push("Hay molestias o dolor anotados.");
  if (illness) reasons.push("Mencionas síntomas de enfermedad: con fiebre o malestar general, descanso hasta 24 h sin fiebre.");

  // ----- veredicto -----
  let verdict: Verdict;
  if (illness) verdict = "recuperar";
  else if (phase === "agotamiento") verdict = "descargar";
  else if (check.molestias) verdict = "recuperar";
  else if (phase === "alarma" || check.malDescanso || check.estresAlto || hardFeels7d >= 2) verdict = "mantener";
  else if (phase === "desentrenamiento" || phase === "supercompensacion" || easyFeels7d > 0 || hardFeels7d === 0) verdict = "progresar";
  else verdict = "mantener";
  if (verdict === "progresar" && easyFeels7d > 0) reasons.push("Los entrenos se te están haciendo fáciles: hay margen para progresar.");

  const LIMITS: Record<Verdict, Readiness["limits"]> = {
    progresar: { maxSessionKmFactor: 1.1, weeklyKmChangePct: 10, qualityAllowed: true },
    mantener: { maxSessionKmFactor: 1.0, weeklyKmChangePct: 0, qualityAllowed: true },
    recuperar: { maxSessionKmFactor: 0.9, weeklyKmChangePct: -20, qualityAllowed: false },
    descargar: { maxSessionKmFactor: 0.7, weeklyKmChangePct: -40, qualityAllowed: true },
  };

  const HEADLINE: Record<Verdict, string> = {
    progresar: "Asimilando bien: toca progresar poco a poco.",
    mantener: "Absorbiendo carga: mantener, no subir todavía.",
    recuperar: "Molestias: proteger la zona y bajar impacto.",
    descargar: "Fatiga acumulada: semana de descarga.",
  };

  const maxSessionKm = longestRun30dKm !== undefined ? Math.round(longestRun30dKm * SPIKE_MARGIN * 10) / 10 : undefined;
  if (maxSessionKm !== undefined && verdict !== "descargar" && verdict !== "recuperar") {
    reasons.push(`Ninguna sesión por encima de ${maxSessionKm} km (tu tirada más larga en 30 días + 10 %).`);
  }

  return {
    phase,
    verdict,
    headline: illness ? "Síntomas de enfermedad: descanso o muy suave." : HEADLINE[verdict],
    reasons,
    check,
    signals: {
      acwr,
      tsb,
      monotony: stats.monotony,
      hardFeels7d,
      easyFeels7d,
      easyRunRpe7d,
      efChangePct,
      missed14d,
      painMentions,
      longestRun30dKm,
      illness,
    },
    limits: { ...LIMITS[verdict], maxSessionKm },
  };
}

export const PHASE_LABEL: Record<SelyePhase, string> = {
  desentrenamiento: "Desentrenamiento",
  alarma: "Alarma",
  adaptacion: "Resistencia (adaptación)",
  agotamiento: "Agotamiento",
  supercompensacion: "Supercompensación",
};
