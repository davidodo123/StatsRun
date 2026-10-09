import "server-only";
// Resumen de un atleta para compararlo con sus amigos.
import type { Db } from "./types";
import { computeStats } from "./engine/stats";
import { matchPlan } from "./engine/planner";
import { addDays, diffDays, mondayOf } from "./dates";

export function athleteSummary(db: Db, today: string) {
  const stats = db.profile ? computeStats(db.activities, db.profile, today) : undefined;
  const matches = db.plan ? matchPlan(db.plan, db.activities, today) : undefined;
  const past = [...(matches?.values() ?? [])].filter((m) => m.session.type !== "strength" && m.session.date < today);
  const compliance = past.length ? past.reduce((s, m) => s + m.compliance, 0) / past.length : undefined;
  const goal = db.plan?.goal ?? db.goal;
  // predicción para la distancia de su carrera: la de la tabla más cercana
  const prediction =
    goal && stats?.predictions.length
      ? [...stats.predictions].sort((a, b) => Math.abs(a.km - goal.distanceKm) - Math.abs(b.km - goal.distanceKm))[0]
      : undefined;
  const plannedByWeek = new Map(db.plan?.weeks.map((w) => [w.start, w.targetKm]) ?? []);
  const weekly = stats?.weeks.slice(-12).map((w) => ({ week: w.week, km: w.runKm, planned: plannedByWeek.get(w.week) })) ?? [];
  const thisWeek = mondayOf(today);
  const weekSessions = db.plan?.weeks.find((w) => w.start === thisWeek)?.sessions ?? [];
  const lastActivity = db.activities.at(-1);
  return {
    stats,
    matches,
    compliance,
    pastSessions: past.length,
    goal,
    daysToRace: goal ? diffDays(goal.date, today) : undefined,
    prediction,
    weekly,
    weekSessions,
    recent: [...db.activities].reverse().slice(0, 10),
    lastActivityDays: lastActivity ? diffDays(today, lastActivity.date) : undefined,
    weekEnd: addDays(thisWeek, 6),
  };
}

export type AthleteSummary = ReturnType<typeof athleteSummary>;
