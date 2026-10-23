import "server-only";
import { getDb } from "./db";
import { computeStats } from "./engine/stats";
import { matchPlan } from "./engine/planner";
import { todayLocal } from "./dates";
import { todayMadrid } from "./health";
import { viewCache } from "./session";

/**
 * Carga datos + estadísticas + cumplimiento del plan. En la caché privada (como getDb): el día de hoy va dentro,
 * así la página no necesita la hora de la petición y la precarga de los enlaces la trae ya pintada.
 */
export async function getAnalysis() {
  "use cache: private";
  viewCache();
  const db = await getDb();
  const today = todayLocal();
  const stats = db.profile ? computeStats(db.activities, db.profile, today) : undefined;
  const matches = db.plan ? matchPlan(db.plan, db.activities, today) : undefined;
  return { db, today, stats, matches };
}

/** El día de hoy para pintar páginas, en la caché privada (la hora de la petición impediría precargarlas). */
export async function viewToday(): Promise<string> {
  "use cache: private";
  viewCache();
  return todayLocal();
}

/** Hoy en Madrid (lo de Salud del iPhone), para pintar páginas: como viewToday. */
export async function viewTodayMadrid(): Promise<string> {
  "use cache: private";
  viewCache();
  return todayMadrid();
}
