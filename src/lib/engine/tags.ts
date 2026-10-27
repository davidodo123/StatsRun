// Etiquetas de cada sesión (estilo Strava): nuevo récord, más larga, más desnivel, mejor ritmo del mes…
// Se calculan en orden cronológico: una etiqueta dice lo que la sesión supuso *cuando se hizo*.
import type { Activity, Db } from "../types";
import { diffDays } from "../dates";
import { BEST_DISTANCES } from "./profile";
import { activityLoad } from "./load";
import { strengthRecords } from "../strength/workouts";
import type { IconName } from "../../components/icons";
import type { Key } from "../i18n";

export type TagKind = "record" | "first" | "longest" | "climb" | "pace" | "load";

export interface ActivityTag {
  kind: TagKind;
  label: string; // en español (para lo que no se traduce)
  key: Key; // el mismo texto en el idioma de cada uno
  vars?: Record<string, string | number>;
  icon: IconName;
}

const DIST_KEY: Record<string, string> = { "5K": "5K", "10K": "10K", "Media maratón": "Media", "Maratón": "Maraton" };

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
  const lifts = strengthRecords(acts);

  for (const a of sorted) {
    const isRun = a.sport === "run" && a.distanceM > 0 && a.movingSec > 0;
    if (isRun) {
      const pace = a.movingSec / a.distanceM;
      // récord por distancia: solo la mayor distancia que cubre la carrera, para no llenar de etiquetas
      const covered = BEST_DISTANCES.filter((d) => a.distanceM >= d.km * 970);
      for (const d of covered.reverse()) {
        const prev = bestPace.get(d.label);
        if (prev === undefined) add(a, { kind: "first", label: `Primer ${d.label}`, key: `tag.primer${DIST_KEY[d.label]}` as Key, icon: "sparkle" });
        else if (pace < prev) add(a, { kind: "record", label: `Récord ${d.label}`, key: `tag.record${DIST_KEY[d.label]}` as Key, icon: "trophy" });
        else continue;
        break;
      }
      for (const d of covered) bestPace.set(d.label, Math.min(bestPace.get(d.label) ?? Infinity, pace));

      if (runsSeen >= MIN_HISTORY && a.distanceM > longest) add(a, { kind: "longest", label: "Tu carrera más larga", key: "tag.masLarga", icon: "ruler" });
      if (runsSeen >= MIN_HISTORY && a.elevationGainM >= 50 && a.elevationGainM > climb) add(a, { kind: "climb", label: "Más desnivel", key: "tag.desnivel", icon: "mountain" });

      // mejor ritmo de los últimos 30 días (carreras de 3 km o más, con al menos 3 en la ventana)
      const window = runs.filter((r) => r.distanceM >= 3000 && diffDays(a.date, r.date) < 30);
      if (a.distanceM >= 3000 && window.length >= MIN_HISTORY && window.every((r) => pace < r.movingSec / r.distanceM))
        add(a, { kind: "pace", label: "Mejor ritmo del mes", key: "tag.ritmoMes", icon: "bolt" });

      longest = Math.max(longest, a.distanceM);
      climb = Math.max(climb, a.elevationGainM);
      runs.push(a);
      runsSeen++;
    }
    const recs = lifts.get(a.id);
    if (recs)
      add(a, {
        kind: "record",
        label: recs.length === 1 ? `Récord en ${recs[0].name}` : `${recs.length} récords de fuerza`,
        key: recs.length === 1 ? "tag.recordEn" : "tag.recordsFuerza",
        vars: recs.length === 1 ? { nombre: recs[0].name } : { n: recs.length },
        icon: "trophy",
      });
    if (loadOf) {
      const load = loadOf(a);
      if (actsSeen >= 5 && load > maxLoad * 1.0001) add(a, { kind: "load", label: "Mayor carga", key: "tag.carga", icon: "flame" });
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