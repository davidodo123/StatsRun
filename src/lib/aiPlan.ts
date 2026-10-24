// Límite de uso de la IA por usuario, para controlar el gasto de OpenRouter.
import type { Db } from "./types";
import { mondayOf } from "./dates";

export type AiUse = "chat" | "routines" | "adapt";

/** Usos por día (rutinas: por semana). «adapt» cuenta todos los reajustes del plan (los automáticos y los pedidos). */
export const AI_LIMITS: Record<AiUse, number> = { chat: 40, routines: 5, adapt: 15 };
const WEEKLY: AiUse[] = ["routines"];

const periodOf = (use: AiUse, today: string) => (WEEKLY.includes(use) ? mondayOf(today) : today);

/** Cuántos usos quedan en el periodo (día o semana). Sin límite (`unlimited`, ver isAiUnlimited): Infinity. */
export function aiLeft(db: Db, use: AiUse, today: string, unlimited = false): number {
  if (unlimited) return Infinity;
  const u = db.aiUsage?.[use];
  const used = u && u.period === periodOf(use, today) ? u.n : 0;
  return Math.max(0, AI_LIMITS[use] - used);
}

/** Apunta un uso (dentro de updateDb). */
export function countAiUse(db: Db, use: AiUse, today: string): void {
  const period = periodOf(use, today);
  const u = db.aiUsage?.[use];
  (db.aiUsage ??= {})[use] = { period, n: u && u.period === period ? u.n + 1 : 1 };
}

const WHAT: Record<AiUse, string> = { chat: "mensajes al entrenador", routines: "rutinas creadas con IA", adapt: "reajustes del plan con IA" };

/** El aviso al llegar al límite. */
export function aiLimitMessage(use: AiUse): string {
  return use === "routines"
    ? `Has usado tus ${AI_LIMITS[use]} ${WHAT[use]} de esta semana. Vuelve el lunes.`
    : `Has usado tus ${AI_LIMITS[use]} ${WHAT[use]} de hoy. Vuelve mañana.`;
}
