// Etiquetas de cada sesión (estilo Strava): nuevo récord, más larga, más desnivel, mejor ritmo del mes…
// Se calculan en orden cronológico: una etiqueta dice lo que la sesión supuso *cuando se hizo*.
import type { Activity, Db } from "../types";
import { diffDays } from "../dates";
import { BEST_DISTANCES } from "./profile";
import { activityLoad } from "./load";

export type TagKind = "record" | "first" | "longest" | "climb" | "pace" | "load";

export interface ActivityTag {
  kind: TagKind;
  label: string;
  icon: string;
}

/** Mínimo de carreras previas para que «la más larga» o «más desnivel» signifique algo. */
const MIN_HISTORY = 3;

/**
 * Etiquetas por id de actividad.
 * `loadOf` (opcional) da la carga de entrenamiento de una sesión para marcar la de mayor carga.
 */
export function activityTags(acts: Activity[], loadOf?: (a: Activity) => number): Map<string, ActivityTag[]> {
  const sorted = [...acts].sort((a, b) => a.startLocal.localeCompare(b.startLocal));
  const out = new Map<string, ActivityTag[]>();
  const add = (a: Activity, t: ActivityTag) => out.set(a.id, [...(out.get(a.id) ?? []), t]);

  const bestPace = new Map<string, number>(); // seg/m por distancia
  let longest = 0;
  let climb = 0;
  let maxLoad = 0;
  let runsSeen = 0;
  let actsSeen = 0;
  const runs: Activity[] = [];

  for (const a of sorted) {
    const isRun = a.sport === "run" && a.distanceM > 0 && a.movingSec > 0;
    if (isRun) {
      const pace = a.movingSec / a.distanceM;
      // récord por distancia: solo la mayor distancia que cubre la carrera, para no llenar de etiquetas
      const covered = BEST_DISTANCES.filter((d) => a.distanceM >= d.km * 970);
      for (const d of covered.reverse()) {
        const prev = bestPace.get(d.label);
        if (prev === undefined) add(a, { kind: "first", label: `Primer ${d.label}`, icon: "🎉" });
        else if (pace < prev) add(a, { kind: "record", label: `Récord ${d.label}`, icon: "🏆" });
        else continue;
        break;
      }
      for (const d of covered) bestPace.set(d.label, Math.min(bestPace.get(d.label) ?? Infinity, pace));

      if (runsSeen >= MIN_HISTORY && a.distanceM > longest) add(a, { kind: "longest", label: "Tu carrera más larga", icon: "📏" });
      if (runsSeen >= MIN_HISTORY && a.elevationGainM >= 50 && a.elevationGainM > climb) add(a, { kind: "climb", label: "Más desnivel", icon: "⛰️" });

      // mejor ritmo de los últimos 30 días (carreras de 3 km o más, con al menos 3 en la ventana)
      const window = runs.filter((r) => r.distanceM >= 3000 && diffDays(a.date, r.date) < 30);
      if (a.distanceM >= 3000 && window.length >= MIN_HISTORY && window.every((r) => pace < r.movingSec / r.distanceM))
        add(a, { kind: "pace", label: "Mejor ritmo del mes", icon: "⚡" });

      longest = Math.max(longest, a.distanceM);
      climb = Math.max(climb, a.elevationGainM);
      runs.push(a);
      runsSeen++;
    }
    if (loadOf) {
      const load = loadOf(a);
      if (actsSeen >= 5 && load > maxLoad * 1.0001) add(a, { kind: "load", label: "Mayor carga", icon: "💪" });
      maxLoad = Math.max(maxLoad, load);
    }
    actsSeen++;
  }
  return out;
}

/** Etiquetas de todas las sesiones de un atleta; con su VDOT también marca la de mayor carga. */
export function tagsForDb(db: Pick<Db, "activities" | "profile">, vdot?: number): Map<string, ActivityTag[]> {
  const profile = db.profile;
  return activityTags(db.activities, profile && vdot ? (a) => activityLoad(a, profile, vdot) : undefined);
}