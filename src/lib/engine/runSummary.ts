// Resumen de una carrera en dos o tres frases (como el «Athlete Intelligence» de Strava), con reglas y sin IA:
// ritmo frente al habitual, distancia frente a las últimas, la zona donde más estuvo, las cuestas y los récords.
import type { Activity } from "../types";
import { diffDays } from "../dates";

export interface SummaryPart {
  key: string; // clave de traducción (ra.s.*)
  params?: Record<string, string | number>;
}

export interface SummaryContext {
  habitualPace?: number; // s/km: mediana de las carreras de los 60 días anteriores
  longestRecentKm?: number; // la más larga de los 30 días anteriores
}

/** Ritmo habitual y carrera más larga de antes de esta (para comparar). */
export function summaryContext(acts: Activity[], a: Activity): SummaryContext {
  const before = acts.filter((x) => x.sport === "run" && x.id !== a.id && x.distanceM >= 1000 && x.date <= a.date && x.startLocal < a.startLocal);
  const paces = before.filter((x) => diffDays(a.date, x.date) <= 60).map((x) => x.movingSec / (x.distanceM / 1000)).sort((p, q) => p - q);
  const recent = before.filter((x) => diffDays(a.date, x.date) <= 30);
  return {
    habitualPace: paces.length >= 3 ? paces[Math.floor(paces.length / 2)] : undefined,
    longestRecentKm: recent.length ? Math.max(...recent.map((x) => x.distanceM / 1000)) : undefined,
  };
}

/**
 * Frases del resumen. `zones`: segundos en Z1-Z6; `records`: distancias (m) en las que es récord;
 * `fmtPace` da el ritmo en m:ss.
 */
export function runSummary(
  run: { paceSec: number; distanceKm: number; gapSec?: number; zones: number[]; records: number[] },
  ctx: SummaryContext,
  fmtPace: (s: number) => string,
): SummaryPart[] {
  const out: SummaryPart[] = [];
  if (ctx.habitualPace) {
    const diff = Math.round(ctx.habitualPace - run.paceSec);
    if (Math.abs(diff) < 5) out.push({ key: "ra.s.igual", params: { ritmo: fmtPace(run.paceSec) } });
    else out.push({ key: diff > 0 ? "ra.s.rapido" : "ra.s.lento", params: { s: Math.abs(diff), ritmo: fmtPace(run.paceSec), habitual: fmtPace(ctx.habitualPace) } });
  }
  if (ctx.longestRecentKm !== undefined && run.distanceKm > ctx.longestRecentKm + 0.2) out.push({ key: "ra.s.larga" });
  const total = run.zones.reduce((s, z) => s + z, 0);
  if (total > 0) {
    const z = run.zones.indexOf(Math.max(...run.zones));
    out.push({ key: "ra.s.zona", params: { z: z + 1, pct: Math.round((run.zones[z] / total) * 100) } });
    // mucho tiempo fuerte en una carrera suave de ritmo: aviso de intensidad
    const hard = (run.zones[4] + run.zones[5]) / total;
    if (hard >= 0.3 && z <= 2) out.push({ key: "ra.s.cambios" });
  }
  if (run.gapSec !== undefined && run.paceSec - run.gapSec >= 8) out.push({ key: "ra.s.cuestas", params: { s: Math.round(run.paceSec - run.gapSec), gap: fmtPace(run.gapSec) } });
  if (run.records.length) out.push({ key: "ra.s.record", params: { n: run.records.length } });
  return out;
}
