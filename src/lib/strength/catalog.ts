// Catálogo de ejercicios: free-exercise-db traducida (scripts/build-exercises.mjs) + los creados por el usuario.
import catalog from "./catalog.json";
import type { CustomExercise, Db, GymPlace } from "../types";
import type { Equipment, Exercise, ExerciseSummary } from "./labels";

export const CATALOG = catalog as Exercise[];
const BY_ID = new Map(CATALOG.map((x) => [x.id, x]));

const fromCustom = (c: CustomExercise): Exercise => ({ ...c, level: "principiante", img: 0, custom: true });

/** Catálogo + ejercicios propios, ordenados por nombre. */
export function allExercises(db: Pick<Db, "customExercises">): Exercise[] {
  const custom = (db.customExercises ?? []).map(fromCustom);
  return custom.length ? [...custom, ...CATALOG].sort((a, b) => a.name.localeCompare(b.name, "es")) : CATALOG;
}

export function findExercise(db: Pick<Db, "customExercises">, id: string): Exercise | undefined {
  const custom = db.customExercises?.find((c) => c.id === id);
  return custom ? fromCustom(custom) : BY_ID.get(id);
}

export const summarize = ({ id, name, cat, eq, muscles, img, imgId, custom }: Exercise): ExerciseSummary => ({ id, name, cat, eq, muscles, img, ...(imgId ? { imgId } : {}), ...(custom ? { custom } : {}) });

/** Lugar activo (o el primero); sin lugares, undefined = sin filtrar por material. */
export function activePlace(db: Pick<Db, "places" | "activePlaceId">): GymPlace | undefined {
  return db.places?.find((p) => p.id === db.activePlaceId) ?? db.places?.[0];
}

/** Material disponible en algún lugar (para saber qué ejercicios puede hacer alguna vez). */
export function allEquipment(db: Pick<Db, "places">): Equipment[] {
  return [...new Set((db.places ?? []).flatMap((p) => p.equipment))];
}
