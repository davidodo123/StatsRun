import "server-only";
import { cache } from "react";
import { getDb } from "./db";
import { computeStats } from "./engine/stats";
import { matchPlan } from "./engine/planner";
import { todayLocal } from "./dates";

/** Carga datos + estadísticas + cumplimiento del plan para una petición. */
export const getAnalysis = cache(async () => {
  const db = await getDb();
  const today = todayLocal();
  const stats = db.profile ? computeStats(db.activities, db.profile, today) : undefined;
  const matches = db.plan ? matchPlan(db.plan, db.activities, today) : undefined;
  return { db, today, stats, matches };
});
