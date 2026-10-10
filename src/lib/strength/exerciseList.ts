// Lista de ejercicios para el navegador: el catálogo viaja en el JS (en caché) y solo los propios en cada página.
import summaries from "./summaries.json";
import type { ExerciseSummary } from "./labels";

const CATALOG = summaries as ExerciseSummary[];

/** Catálogo + ejercicios propios, ordenados por nombre. */
export const withCustom = (custom: ExerciseSummary[]) => (custom.length ? [...custom, ...CATALOG].sort((a, b) => a.name.localeCompare(b.name, "es")) : CATALOG);
