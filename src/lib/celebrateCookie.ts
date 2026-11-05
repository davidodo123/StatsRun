import type { SportKind } from "./types";

/** Cookie de vida corta: «se acaba de registrar un entreno de este deporte» (la pone el servidor y la lee el navegador). */
export const CELEBRATE_COOKIE = "rio_fiesta";

const SPORTS: SportKind[] = ["run", "ride", "swim", "walk", "strength", "other"];

/** El deporte que trae la cookie; si no se reconoce, «other» (sale la animación genérica). */
export const celebrationSport = (value: string): SportKind => SPORTS.find((s) => s === value) ?? "other";
